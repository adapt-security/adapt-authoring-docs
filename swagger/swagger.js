import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

function resolvePath(relativePath) {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}
/**
 * 
 */
export default async function swagger(app, configs, outputdir) {
  const server = await app.waitForModule('server');
  await app.onReady();
  const spec = {
    openapi: '3.0.3',
    info: { version: app.pkg.version },
    components: { schemas: await generateSchemaSpec(app) },
    paths: generatePathSpec(app, server.api)
  };
  // generate UI
  const dir = path.resolve(outputdir, 'rest');
  const cssDir = path.resolve(dir, 'styles');
  const jsDir = path.resolve(dir, 'js');
  const distDir = 'node_modules/swagger-ui/dist';

  await fs.mkdir(dir);
  await fs.mkdir(cssDir);
  await fs.mkdir(jsDir);

  await Promise.all([
    fs.cp(resolvePath('./index.html'), path.resolve(dir, 'index.html')),
    fs.cp(path.join(distDir, 'swagger-ui.css'), path.resolve(cssDir, 'swagger-ui.css')),
    fs.cp(resolvePath('./styles/adapt.css'), path.resolve(cssDir, 'adapt.css')),
    fs.cp(resolvePath(`../assets`), path.resolve(dir, 'assets'), { recursive: true }),
    fs.cp(path.join(distDir, 'swagger-ui-bundle.js'), path.resolve(jsDir, 'swagger-ui-bundle.js')),
    fs.cp(path.join(distDir, 'swagger-ui-standalone-preset.js'), path.resolve(jsDir, 'swagger-ui-standalone-preset.js')),
    fs.writeFile(path.resolve(dir, 'api.json'), JSON.stringify(spec, null, 2)),
  ]);
}

async function generateSchemaSpec(app) {
  const jsonschema = await app.waitForModule('jsonschema');
  const schemas = {};
  await Promise.all(Object.keys(jsonschema.schemas).map(async s => {
    schemas[s] = sanitiseSchema((await jsonschema.getSchema(s)).built);
  }));
  return schemas;
}

function sanitiseSchema(schema) {
  const props = schema.properties ?? schema;
  for (const prop in props) {
    const s = props[prop];
    if(s.type === 'object') props[prop] = sanitiseSchema(s);
    if(s.isInternal || s.isReadOnly) delete props[prop];
  }
  return schema;
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
    const route = `${router.path}${r.route !== '/' ? r.route : ''}`;
    paths[route] = Object.keys(r.handlers).reduce((memo, method) => {
      const meta = r.meta?.[method] || {};
      const scopes = perms[method].find(p => route.match(p[0]))?.[1] || [];
      let description = r.internal ? `ROUTE IS ONLY ACCESSIBLE FROM LOCALHOST.<br/><br/>` : '';
      description +=  scopes.length ?
        `Required scopes: ${scopes.map(s => `<span>${s}</span>`).join(' ')}` : 
        'Route requires no authentication';

      if(meta.description) description += `<br/><br/>${meta.description}`

      return Object.assign(memo, {
        [method]: { 
          ...meta,
          tags: [router.path.split('/').slice(2).join(' ')], 
          description,
          parameters: meta.parameters ? parameters.concat(meta.parameters) : parameters,
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