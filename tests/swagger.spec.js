import assert from 'node:assert/strict'
import { describe, it, mock, afterEach } from 'node:test'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

/**
 * The swagger module's internal functions (sanitiseSchema, generatePathSpec)
 * are not exported, so we test the main export function with a mocked app.
 * We also test the internal logic indirectly through the generated output.
 */

// We need to import swagger dynamically to avoid import.meta.url resolution issues
// The swagger function requires a fully configured app object with waitForModule
// and other dependencies, so we create thorough mocks.

describe('swagger', () => {
  let tmpDir

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  describe('sanitiseSchema (tested indirectly via swagger output)', () => {
    it('should remove isInternal properties from schemas', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {
          TestSchema: {
            built: {
              properties: {
                publicProp: { type: 'string' },
                internalProp: { type: 'string', isInternal: true }
              }
            }
          }
        },
        routes: []
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      assert.ok(spec.components.schemas.TestSchema)
      assert.ok(spec.components.schemas.TestSchema.properties.publicProp)
      assert.equal(spec.components.schemas.TestSchema.properties.internalProp, undefined)
    })

    it('should remove isReadOnly properties from schemas', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {
          TestSchema: {
            built: {
              properties: {
                publicProp: { type: 'string' },
                readOnlyProp: { type: 'string', isReadOnly: true }
              }
            }
          }
        },
        routes: []
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      assert.ok(spec.components.schemas.TestSchema.properties.publicProp)
      assert.equal(spec.components.schemas.TestSchema.properties.readOnlyProp, undefined)
    })

    it('should recursively sanitise nested object properties', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {
          TestSchema: {
            built: {
              properties: {
                nested: {
                  type: 'object',
                  properties: {
                    visible: { type: 'string' },
                    hidden: { type: 'string', isInternal: true }
                  }
                }
              }
            }
          }
        },
        routes: []
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      const nested = spec.components.schemas.TestSchema.properties.nested
      assert.ok(nested.properties.visible)
      assert.equal(nested.properties.hidden, undefined)
    })
  })

  describe('generatePathSpec (tested indirectly via swagger output)', () => {
    it('should generate paths from router routes', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {},
        routes: [
          {
            route: '/',
            handlers: { get: () => {} },
            meta: {},
            internal: false
          }
        ],
        routerPath: '/api/test'
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      assert.ok(spec.paths['/api/test'])
      assert.ok(spec.paths['/api/test'].get)
    })

    it('should extract path parameters from route', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {},
        routes: [
          {
            route: '/:id',
            handlers: { get: () => {} },
            meta: {},
            internal: false
          }
        ],
        routerPath: '/api/test'
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      const params = spec.paths['/api/test/:id'].get.parameters
      assert.ok(params.some(p => p.name === 'id' && p.in === 'path' && p.required === true))
    })

    it('should handle optional path parameters', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {},
        routes: [
          {
            route: '/:id?',
            handlers: { get: () => {} },
            meta: {},
            internal: false
          }
        ],
        routerPath: '/api/test'
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      const params = spec.paths['/api/test/:id?'].get.parameters
      assert.ok(params.some(p => p.name === 'id' && p.required === false))
    })

    it('should mark internal routes in description', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {},
        routes: [
          {
            route: '/',
            handlers: { get: () => {} },
            meta: {},
            internal: true
          }
        ],
        routerPath: '/api/test'
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      assert.ok(spec.paths['/api/test'].get.description.includes('ONLY ACCESSIBLE FROM LOCALHOST'))
    })

    it('should sort paths alphabetically', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {},
        routes: [
          {
            route: '/zebra',
            handlers: { get: () => {} },
            meta: {},
            internal: false
          },
          {
            route: '/alpha',
            handlers: { get: () => {} },
            meta: {},
            internal: false
          }
        ],
        routerPath: '/api/test'
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      const keys = Object.keys(spec.paths)
      assert.ok(keys.indexOf('/api/test/alpha') < keys.indexOf('/api/test/zebra'))
    })

    it('should process child routers recursively', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({
        schemas: {},
        routes: [
          {
            route: '/',
            handlers: { get: () => {} },
            meta: {},
            internal: false
          }
        ],
        routerPath: '/api/parent',
        childRouters: [
          {
            path: '/api/parent/child',
            routes: [
              {
                route: '/',
                handlers: { post: () => {} },
                meta: {},
                internal: false
              }
            ],
            childRouters: []
          }
        ]
      })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      assert.ok(spec.paths['/api/parent'])
      assert.ok(spec.paths['/api/parent/child'])
    })
  })

  describe('swagger output structure', () => {
    it('should generate valid OpenAPI 3.0.3 spec', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({ schemas: {}, routes: [] })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'rest', 'api.json'), 'utf8'))
      assert.equal(spec.openapi, '3.0.3')
      assert.ok(spec.info)
      assert.ok(spec.info.version)
      assert.ok(spec.components)
      assert.ok(spec.paths)
    })

    it('should create rest directory with required files', async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swagger-test-'))
      const outputDir = tmpDir

      const mockApp = createMockApp({ schemas: {}, routes: [] })

      const { default: swagger } = await import('../swagger/swagger.js')
      await swagger(mockApp, [], outputDir)

      const restDir = path.join(outputDir, 'rest')
      const stat = await fs.stat(restDir)
      assert.ok(stat.isDirectory())

      const indexHtml = await fs.stat(path.join(restDir, 'index.html'))
      assert.ok(indexHtml.isFile())

      const apiJson = await fs.stat(path.join(restDir, 'api.json'))
      assert.ok(apiJson.isFile())
    })
  })
})

function createMockApp (options = {}) {
  const { schemas = {}, routes = [], routerPath = '/api/test', childRouters = [] } = options

  const mockSchemas = {}
  for (const name of Object.keys(schemas)) {
    mockSchemas[name] = true
  }

  return {
    pkg: { version: '1.0.0' },
    dependencyloader: {
      instances: {
        'adapt-authoring-auth': {
          permissions: {
            routes: {
              get: [],
              post: [],
              put: [],
              patch: [],
              delete: []
            }
          }
        }
      }
    },
    waitForModule: mock.fn(async (name) => {
      if (name === 'jsonschema') {
        return {
          schemas: mockSchemas,
          getSchema: mock.fn(async (s) => schemas[s])
        }
      }
      if (name === 'server') {
        return {
          api: {
            path: routerPath,
            routes,
            childRouters
          }
        }
      }
      return {}
    }),
    onReady: mock.fn(async () => {})
  }
}
