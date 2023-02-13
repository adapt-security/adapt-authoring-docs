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
  const server = await app.waitForModule('server');
  const spec = {
    openapi: '3.0.3',
    info: { version: app.pkg.version },
    components: {
      schemas: generateSchemaSpec(app)
    },
    paths: generatePathSpec(app, server.api)
  };
  // generate UI
  const b = browserify({ plugin: [[esmify]]});
  b.add(resolvePath('./js/index.js'));

  const dir = path.resolve(outputdir, 'rest');
  const cssDir = path.resolve(dir, 'styles');
  const jsDir = path.resolve(dir, 'js');

  await fs.mkdir(dir);
  await fs.mkdir(cssDir);
  await fs.mkdir(jsDir);

  await Promise.all([
    fs.cp(resolvePath('./index.html'), path.resolve(dir, 'index.html')),
    fs.cp('node_modules/swagger-ui/dist/swagger-ui.css', path.resolve(cssDir, 'swagger.css')),
    fs.cp(resolvePath('./styles/adapt.css'), path.resolve(cssDir, 'adapt.css')),
    fs.cp(resolvePath(`../assets`), path.resolve(dir, 'assets'), { recursive: true }),
    fs.writeFile(path.resolve(dir, 'api.json'), JSON.stringify(spec, null, 2)),
    new Promise((resolve, reject) => {
      b.bundle().pipe(fsSync.createWriteStream(path.resolve(jsDir, 'swagger.js')))
        .on('error', e => reject(e))
        .on('finish', () => resolve());
    })
  ]);
}

async function generateSchemaSpec(app) {
  const jsonschema = await app.waitForModule('jsonschema');
  const schemas = {};
  await Promise.all(Object.keys(jsonschema.schemaPaths).map(async s => schemas[s] = await jsonschema.loadSchema(s)));
  return schemas;
}

function generatePathSpec(app, router, paths = {}) {
  const perms = app.dependencyloader.instances['adapt-authoring-auth'].permissions.routes;
  router.routes.forEach(r => {
    const parameters = r.route.split('/').filter(r => r.startsWith(':')).map(r => {
      return {
        name: r.replaceAll(/:|\?/g, ''),
        in: 'path',
        required: !r.endsWith('?')
      };
    });
    const route = `${router.path}${r.route}`;
    paths[route] = Object.keys(r.handlers).reduce((memo, method) => {
      const meta = r.meta?.[method] || {};
      const scopes = perms[method].find(p => route.match(p[0]))?.[1] || [];
      return Object.assign(memo, {
        [method]: { 
          tags: [router.path.split('/').slice(2).join(' ')], 
          summary: meta.description,
          description: scopes ? 
            `Required scopes: ${scopes.map(s => `<span>${s}</apan>`).join(' ')}` : 
            'Route requires no authentication',
          parameters: meta.parameters ? parameters.concat(meta.parameters) : parameters,
          requestBody: meta.requestBody,
          security: { roles: scopes }
        }
      });
    }, {});
  });
  if(router.childRouters.length) {
    router.childRouters.forEach(childRouter => generatePathSpec(app, childRouter, paths));
  }
  return Object.keys(paths).sort().reduce((m, k) => Object.assign(m, { [k]: paths[k] }), {});
}