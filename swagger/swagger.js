import browserify from 'browserify';
import esmify from 'esmify';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

function resolvePath(relativePath) {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}
/**
 * 
 */
export default async function swagger(app, configs, outputdir) {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: app.name,
      version: app.version
    },
    paths: {}
  };
  // parse all module APIs
  await Promise.all(configs.filter(c => c.api).map(async c => {
    const apiJson = JSON.parse((await fs.readFile(path.join(c.rootDir, 'docs', 'api.json'))).toString());
    Object.assign(spec.paths, apiJson.paths);
  }));
  // generate UI
  const b = browserify({ plugin: [[esmify]]});
  b.add(resolvePath('./index.js'));

  const dir = path.resolve(outputdir, 'rest');
  const cssDir = path.resolve(dir, 'css');
  const jsDir = path.resolve(dir, 'js');

  await fs.mkdir(dir);
  await fs.mkdir(cssDir);
  await fs.mkdir(jsDir);

  await Promise.all([
    fs.cp(resolvePath('./index.html'), path.resolve(dir, 'index.html')),
    fs.cp('node_modules/swagger-ui/dist/swagger-ui.css', path.resolve(cssDir, 'swagger.css')),
    fs.cp(resolvePath('./css/adapt.css'), path.resolve(cssDir, 'adapt.css')),
    fs.writeFile(path.resolve(dir, 'api.json'), JSON.stringify(spec, null, 2)),
    new Promise((resolve, reject) => {
      b.bundle().pipe(fsSync.createWriteStream(path.resolve(jsDir, 'swagger.js')))
        .on('error', e => reject(e))
        .on('finish', () => resolve());
    })
  ]);
}