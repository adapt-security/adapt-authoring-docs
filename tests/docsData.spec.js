import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

/* eslint-disable no-template-curly-in-string */
/**
 * Creates a temporary fixture directory that simulates a minimal
 * adapt-authoring app so docsData functions can be tested in isolation.
 */
async function createFixture () {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-data-'))

  // root package.json + adapt-authoring.json
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
    name: 'adapt-authoring',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(root, 'adapt-authoring.json'), JSON.stringify({
    module: false,
    documentation: { enable: true },
    essentialApis: []
  }))

  // --- fake api module (library, not a loaded module) ---
  const apiDir = path.join(root, 'node_modules', 'adapt-authoring-api')
  await fs.mkdir(path.join(apiDir, 'lib'), { recursive: true })
  await fs.writeFile(path.join(apiDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-api',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(apiDir, 'adapt-authoring.json'), JSON.stringify({
    module: false,
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(apiDir, 'lib', 'default-routes.json'), JSON.stringify({
    routes: [
      {
        route: '/',
        handlers: { post: 'requestHandler', get: 'queryHandler' },
        permissions: { post: ['write:${scope}'], get: ['read:${scope}'] }
      },
      {
        route: '/:_id',
        handlers: { get: 'requestHandler', delete: 'requestHandler' },
        permissions: { get: ['read:${scope}'], delete: ['write:${scope}'] }
      }
    ]
  }))

  // --- fake auth module ---
  const authDir = path.join(root, 'node_modules', 'adapt-authoring-auth')
  await fs.mkdir(path.join(authDir, 'lib'), { recursive: true })
  await fs.writeFile(path.join(authDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-auth',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(authDir, 'adapt-authoring.json'), JSON.stringify({
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(authDir, 'lib', 'routes.json'), JSON.stringify({
    routes: [
      {
        route: '/check',
        handlers: { get: 'checkHandler' },
        permissions: { get: null }
      }
    ]
  }))
  await fs.writeFile(path.join(authDir, 'lib', 'default-routes.json'), JSON.stringify({
    routes: [
      {
        route: '/',
        handlers: { post: 'authenticateHandler' },
        permissions: { post: null }
      },
      {
        route: '/register',
        handlers: { post: 'registerHandler' },
        permissions: { post: ['register:users'] }
      }
    ]
  }))

  // --- fake auth-local module (auth type) ---
  const authLocalDir = path.join(root, 'node_modules', 'adapt-authoring-auth-local')
  await fs.mkdir(authLocalDir, { recursive: true })
  await fs.writeFile(path.join(authLocalDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-auth-local',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(authLocalDir, 'adapt-authoring.json'), JSON.stringify({
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(authLocalDir, 'routes.json'), JSON.stringify({
    type: 'local',
    routes: [
      {
        route: '/',
        override: true,
        handlers: { post: 'authenticateHandler' },
        meta: { post: { summary: 'Local auth' } }
      },
      {
        route: '/changepass',
        handlers: { post: 'changePasswordHandler' },
        permissions: { post: null }
      }
    ]
  }))

  // --- fake content module (API module) ---
  const contentDir = path.join(root, 'node_modules', 'adapt-authoring-content')
  await fs.mkdir(path.join(contentDir, 'schema'), { recursive: true })
  await fs.mkdir(path.join(contentDir, 'errors'), { recursive: true })
  await fs.mkdir(path.join(contentDir, 'conf'), { recursive: true })
  await fs.writeFile(path.join(contentDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-content',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(contentDir, 'adapt-authoring.json'), JSON.stringify({
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(contentDir, 'routes.json'), JSON.stringify({
    root: 'content',
    routes: [
      {
        route: '/clone',
        handlers: { post: 'handleClone' },
        permissions: { post: ['write:${scope}'] }
      }
    ]
  }))
  await fs.writeFile(path.join(contentDir, 'schema', 'content.schema.json'), JSON.stringify({
    $anchor: 'content',
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' }
    }
  }))
  await fs.writeFile(path.join(contentDir, 'errors', 'errors.json'), JSON.stringify({
    CONTENT_NOT_FOUND: { statusCode: 404, description: 'Content not found' }
  }))
  await fs.writeFile(path.join(contentDir, 'conf', 'config.schema.json'), JSON.stringify({
    type: 'object',
    properties: {
      cacheDir: { type: 'string', default: '$TEMP/content-cache' }
    }
  }))

  // --- fake docs module with config ---
  const docsDir = path.join(root, 'node_modules', 'adapt-authoring-docs')
  await fs.mkdir(path.join(docsDir, 'conf'), { recursive: true })
  await fs.writeFile(path.join(docsDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-docs',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(docsDir, 'adapt-authoring.json'), JSON.stringify({
    module: false,
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(docsDir, 'conf', 'config.schema.json'), JSON.stringify({
    type: 'object',
    properties: {
      outputDir: { type: 'string', default: '$TEMP/docs-build' },
      manualSections: {
        type: 'object',
        default: { 'getting-started': {}, 'other-guides': { default: true } }
      }
    }
  }))

  // --- module with useDefaultRoutes: false ---
  const courseassetDir = path.join(root, 'node_modules', 'adapt-authoring-courseassets')
  await fs.mkdir(courseassetDir, { recursive: true })
  await fs.writeFile(path.join(courseassetDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-courseassets',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(courseassetDir, 'adapt-authoring.json'), JSON.stringify({
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(courseassetDir, 'routes.json'), JSON.stringify({
    root: 'courseassets',
    useDefaultRoutes: false,
    routes: [
      {
        route: '/query',
        handlers: { post: 'queryHandler' },
        permissions: { post: ['read:${scope}'] }
      }
    ]
  }))

  // --- module with custom permissionsScope ---
  const themeDir = path.join(root, 'node_modules', 'adapt-authoring-coursetheme')
  await fs.mkdir(themeDir, { recursive: true })
  await fs.writeFile(path.join(themeDir, 'package.json'), JSON.stringify({
    name: 'adapt-authoring-coursetheme',
    version: '1.0.0'
  }))
  await fs.writeFile(path.join(themeDir, 'adapt-authoring.json'), JSON.stringify({
    documentation: { enable: true }
  }))
  await fs.writeFile(path.join(themeDir, 'routes.json'), JSON.stringify({
    root: 'coursethemepresets',
    permissionsScope: 'content',
    routes: [
      {
        route: '/:_id/apply',
        handlers: { post: 'applyHandler' },
        permissions: { post: ['write:${scope}'] }
      }
    ]
  }))

  return root
}

describe('docsData', () => {
  let fixtureDir
  let dependencies

  before(async () => {
    fixtureDir = await createFixture()
    const { loadDependencies } = await import('../lib/docsData.js')
    dependencies = await loadDependencies(fixtureDir)
  })

  after(async () => {
    if (fixtureDir) await fs.rm(fixtureDir, { recursive: true, force: true }).catch(() => {})
  })

  describe('loadDependencies', () => {
    it('should discover all modules with adapt-authoring.json', () => {
      assert.ok(dependencies['adapt-authoring-content'])
      assert.ok(dependencies['adapt-authoring-auth'])
      assert.ok(dependencies['adapt-authoring-auth-local'])
      assert.ok(dependencies['adapt-authoring-docs'])
      assert.ok(dependencies['adapt-authoring-api'])
    })

    it('should merge package.json and adapt-authoring.json for each dep', () => {
      const content = dependencies['adapt-authoring-content']
      assert.equal(content.name, 'adapt-authoring-content')
      assert.equal(content.version, '1.0.0')
      assert.ok(content.documentation)
      assert.ok(content.rootDir)
    })

    it('should set rootDir on each dependency', () => {
      for (const dep of Object.values(dependencies)) {
        assert.ok(dep.rootDir, `${dep.name} should have rootDir`)
        assert.ok(dep.rootDir.includes('node_modules'), `${dep.name} rootDir should be in node_modules`)
      }
    })
  })

  describe('loadConfigDefaults', () => {
    it('should resolve $TEMP to os.tmpdir()', async () => {
      const { loadConfigDefaults } = await import('../lib/docsData.js')
      const config = await loadConfigDefaults(dependencies)
      const outputDir = config.get('adapt-authoring-docs.outputDir')
      assert.ok(outputDir.startsWith(os.tmpdir()), `expected ${outputDir} to start with ${os.tmpdir()}`)
      assert.ok(outputDir.endsWith('/docs-build'))
    })

    it('should return object defaults', async () => {
      const { loadConfigDefaults } = await import('../lib/docsData.js')
      const config = await loadConfigDefaults(dependencies)
      const sections = config.get('adapt-authoring-docs.manualSections')
      assert.ok(sections)
      assert.ok(sections['getting-started'] !== undefined)
      assert.ok(sections['other-guides']?.default === true)
    })

    it('should return undefined for unknown config keys', async () => {
      const { loadConfigDefaults } = await import('../lib/docsData.js')
      const config = await loadConfigDefaults(dependencies)
      assert.equal(config.get('nonexistent.key'), undefined)
    })

    it('should resolve $TEMP in non-docs modules', async () => {
      const { loadConfigDefaults } = await import('../lib/docsData.js')
      const config = await loadConfigDefaults(dependencies)
      const cacheDir = config.get('adapt-authoring-content.cacheDir')
      assert.ok(cacheDir.startsWith(os.tmpdir()))
      assert.ok(cacheDir.endsWith('/content-cache'))
    })
  })

  describe('buildRouterTree', () => {
    it('should return api root router', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      assert.equal(routerTree.path, '/api')
    })

    it('should create child routers for API modules', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const paths = routerTree.childRouters.map(r => r.path)
      assert.ok(paths.includes('/api/content'))
    })

    it('should merge default routes for API modules', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const contentRouter = routerTree.childRouters.find(r => r.path === '/api/content')
      assert.ok(contentRouter)
      const routePaths = contentRouter.routes.map(r => r.route)
      // default routes: / and /:_id, plus custom: /clone
      assert.ok(routePaths.includes('/'), 'should have default root route')
      assert.ok(routePaths.includes('/:_id'), 'should have default :_id route')
      assert.ok(routePaths.includes('/clone'), 'should have custom clone route')
    })

    it('should skip default routes when useDefaultRoutes is false', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const router = routerTree.childRouters.find(r => r.path === '/api/courseassets')
      assert.ok(router)
      assert.equal(router.routes.length, 1)
      assert.equal(router.routes[0].route, '/query')
    })

    it('should replace placeholders in route config', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const contentRouter = routerTree.childRouters.find(r => r.path === '/api/content')
      const rootRoute = contentRouter.routes.find(r => r.route === '/')
      assert.deepEqual(rootRoute.permissions.post, ['write:content'])
      assert.deepEqual(rootRoute.permissions.get, ['read:content'])
    })

    it('should use permissionsScope for placeholder when defined', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const themeRouter = routerTree.childRouters.find(r => r.path === '/api/coursethemepresets')
      assert.ok(themeRouter)
      const applyRoute = themeRouter.routes.find(r => r.route === '/:_id/apply')
      assert.deepEqual(applyRoute.permissions.post, ['write:content'])
    })

    it('should create auth router at /api/auth', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const authRouter = routerTree.childRouters.find(r => r.path === '/api/auth')
      assert.ok(authRouter)
      assert.ok(authRouter.routes.some(r => r.route === '/check'))
    })

    it('should create auth type child routers', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const authRouter = routerTree.childRouters.find(r => r.path === '/api/auth')
      const localRouter = authRouter.childRouters.find(r => r.path === '/api/auth/local')
      assert.ok(localRouter)
    })

    it('should merge auth type routes with auth defaults', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const authRouter = routerTree.childRouters.find(r => r.path === '/api/auth')
      const localRouter = authRouter.childRouters.find(r => r.path === '/api/auth/local')
      const routePaths = localRouter.routes.map(r => r.route)
      // override route: /, default: /register, custom: /changepass
      assert.ok(routePaths.includes('/'), 'should have root (overridden) route')
      assert.ok(routePaths.includes('/register'), 'should have default register route')
      assert.ok(routePaths.includes('/changepass'), 'should have custom changepass route')
    })

    it('should apply override merging from auth type routes', async () => {
      const { buildRouterTree } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const authRouter = routerTree.childRouters.find(r => r.path === '/api/auth')
      const localRouter = authRouter.childRouters.find(r => r.path === '/api/auth/local')
      const rootRoute = localRouter.routes.find(r => r.route === '/')
      // override merged meta from auth-local onto default
      assert.ok(rootRoute.meta?.post?.summary === 'Local auth')
    })
  })

  describe('loadSchemas', () => {
    it('should load schemas from schema/*.schema.json', async () => {
      const { loadSchemas } = await import('../lib/docsData.js')
      const schemas = await loadSchemas(dependencies)
      assert.ok(schemas.schemas.content)
    })

    it('should provide getSchema returning built schema', async () => {
      const { loadSchemas } = await import('../lib/docsData.js')
      const schemas = await loadSchemas(dependencies)
      const result = await schemas.getSchema('content')
      assert.ok(result.built)
      assert.equal(result.built.type, 'object')
      assert.ok(result.built.properties.title)
    })

    it('should return empty object for unknown schemas', async () => {
      const { loadSchemas } = await import('../lib/docsData.js')
      const schemas = await loadSchemas(dependencies)
      const result = await schemas.getSchema('nonexistent')
      assert.deepEqual(result.built, {})
    })
  })

  describe('loadErrors', () => {
    it('should load and merge errors from errors/*.json', async () => {
      const { loadErrors } = await import('../lib/docsData.js')
      const errors = await loadErrors(dependencies)
      assert.ok(errors.CONTENT_NOT_FOUND)
      assert.equal(errors.CONTENT_NOT_FOUND.statusCode, 404)
      assert.equal(errors.CONTENT_NOT_FOUND.code, 'CONTENT_NOT_FOUND')
      assert.equal(errors.CONTENT_NOT_FOUND.meta.description, 'Content not found')
    })
  })

  describe('buildPermissions', () => {
    it('should build permission store with HTTP methods', async () => {
      const { buildRouterTree, buildPermissions } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const perms = buildPermissions(routerTree)
      assert.ok(Array.isArray(perms.get))
      assert.ok(Array.isArray(perms.post))
      assert.ok(Array.isArray(perms.put))
      assert.ok(Array.isArray(perms.patch))
      assert.ok(Array.isArray(perms.delete))
    })

    it('should contain permission entries for secured routes', async () => {
      const { buildRouterTree, buildPermissions } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const perms = buildPermissions(routerTree)
      assert.ok(perms.post.length > 0, 'should have POST permission entries')
      assert.ok(perms.get.length > 0, 'should have GET permission entries')
    })

    it('should skip routes with null permissions (unsecured)', async () => {
      const { buildRouterTree, buildPermissions } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const perms = buildPermissions(routerTree)
      // /api/auth/check has permissions: { get: null } — should not appear
      const checkMatch = perms.get.find(([re]) => re.test('/api/auth/check'))
      assert.equal(checkMatch, undefined, '/api/auth/check should not be in secured routes')
    })

    it('should store scopes as arrays in permission entries', async () => {
      const { buildRouterTree, buildPermissions } = await import('../lib/docsData.js')
      const routerTree = await buildRouterTree(dependencies)
      const perms = buildPermissions(routerTree)
      for (const entries of Object.values(perms)) {
        for (const [re, scopes] of entries) {
          assert.ok(re instanceof RegExp, 'first element should be RegExp')
          assert.ok(Array.isArray(scopes), 'second element should be array')
        }
      }
    })
  })
})
