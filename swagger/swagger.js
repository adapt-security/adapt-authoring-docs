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
    openapi: "3.1.0",
    info: {
      title: "adapt-authoring",
      version: "1.0.0"
      // title: app.name,
      // version: app.version
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

  const dir = path.resolve(outputdir, 'swagger');
  await fs.mkdir(dir);
  await fs.cp(resolvePath('./index.html'), path.resolve(dir, 'index.html'));

  await new Promise((resolve, reject) => {
    b.bundle().pipe(fsSync.createWriteStream(path.resolve(dir, 'swagger.js')))
      // .on('error', e => reject(e))
      .on('error', e => {
        console.log('------------------->');
        console.log(e);
        reject(e);
      })
      .on('finish', () => resolve());
  });
}