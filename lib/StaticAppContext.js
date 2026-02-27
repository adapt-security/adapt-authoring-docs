import { loadDependencyFiles, readJson } from 'adapt-authoring-core'
import { glob } from 'glob'
import os from 'os'
import path from 'path'
import { pathToRegexp } from 'path-to-regexp'

/**
 * Replaces App.instance for static documentation builds.
 * Scans the filesystem for module configs, routes, schemas, errors and
 * permissions so that generators can run without starting the full app.
 * @memberof docs
 */
class StaticAppContext {
  /**
   * Scans rootDir and returns a fully-initialised context.
   * @param {string} rootDir Absolute path to the app root (where package.json lives)
   * @returns {Promise<StaticAppContext>}
   */
  static async init (rootDir) {
    const ctx = new StaticAppContext()
    ctx.rootDir = rootDir

    const rootPkg = await readJson(path.join(rootDir, 'package.json'))
    const rootMeta = await readJson(path.join(rootDir, 'adapt-authoring.json'))
    ctx.pkg = { ...rootPkg, ...rootMeta }

    ctx.dependencies = await ctx.#loadDependencies()
    ctx.config = await ctx.#buildConfig()
    ctx.errors = await ctx.#loadErrors()

    const schemas = await ctx.#loadSchemas()
    const routerTree = await ctx.#buildRouterTree()
    const permissions = ctx.#buildPermissions(routerTree)

    ctx.dependencyloader = {
      instances: {
        'adapt-authoring-auth': { permissions: { routes: permissions } }
      }
    }
    ctx.#serverMock = { api: routerTree }
    ctx.#jsonschemaMock = schemas
    return ctx
  }

  #serverMock
  #jsonschemaMock

  async onReady () {}

  /**
   * Returns a mock module matching the name requested by generators.
   * @param {string} modName Module name (short or full)
   * @returns {Promise<Object>}
   */
  async waitForModule (modName) {
    if (modName === 'server') return this.#serverMock
    if (modName === 'jsonschema') return this.#jsonschemaMock
    return {}
  }

  // ------- dependency scanning -------

  async #loadDependencies () {
    const files = await glob('node_modules/**/adapt-authoring.json', {
      cwd: this.rootDir,
      absolute: true
    })
    const seen = new Set()
    const deps = {}
    const sorted = files.sort((a, b) => a.length - b.length)
    for (const file of sorted) {
      const dir = path.dirname(file)
      try {
        const pkg = await readJson(path.join(dir, 'package.json'))
        if (seen.has(pkg.name)) continue
        seen.add(pkg.name)
        const meta = await readJson(file)
        deps[pkg.name] = { ...pkg, ...meta, rootDir: dir }
      } catch {
        // skip modules with unreadable config
      }
    }
    return deps
  }

  // ------- config defaults -------

  async #buildConfig () {
    const defaults = {}
    await Promise.all(Object.values(this.dependencies).map(async dep => {
      const schemaPath = path.join(dep.rootDir, 'conf', 'config.schema.json')
      try {
        const schema = await readJson(schemaPath)
        const props = schema.properties || {}
        const modDefaults = {}
        for (const [key, prop] of Object.entries(props)) {
          if (prop.default !== undefined) modDefaults[key] = prop.default
        }
        if (Object.keys(modDefaults).length) defaults[dep.name] = modDefaults
      } catch {
        // no config schema for this module
      }
    }))
    return {
      get: (key) => {
        const dotIdx = key.indexOf('.')
        if (dotIdx === -1) return defaults[key]
        const modName = key.slice(0, dotIdx)
        const propKey = key.slice(dotIdx + 1)
        const val = defaults[modName]?.[propKey]
        if (typeof val === 'string') return val.replace('$TEMP', os.tmpdir())
        return val
      }
    }
  }

  // ------- errors -------

  async #loadErrors () {
    const allErrors = await loadDependencyFiles('errors/*.json', {
      parse: true,
      dependencies: this.dependencies
    })
    const merged = {}
    for (const arr of Object.values(allErrors)) {
      for (const obj of arr) Object.assign(merged, obj)
    }
    return merged
  }

  // ------- schemas -------

  async #loadSchemas () {
    const allSchemas = await loadDependencyFiles('schema/*.schema.json', {
      parse: true,
      dependencies: this.dependencies
    })
    const schemaMap = {}
    const rawMap = {}
    for (const [, arr] of Object.entries(allSchemas)) {
      for (const schema of arr) {
        const name = schema.$anchor || schema.$id || 'unknown'
        schemaMap[name] = true
        rawMap[name] = schema
      }
    }
    return {
      schemas: schemaMap,
      raw: rawMap,
      getSchema: async (name) => ({ built: rawMap[name] || {} })
    }
  }

  // ------- router tree -------

  async #buildRouterTree () {
    const apiRouter = { path: '/api', routes: [], childRouters: [] }
    let authRouter = null
    let apiDefaultRoutes = null
    let authDefaultRoutes = null

    // Find the core auth module and API module for their defaults
    const authDep = this.dependencies['adapt-authoring-auth']
    const apiDep = this.dependencies['adapt-authoring-api']

    if (apiDep) {
      try {
        apiDefaultRoutes = await readJson(path.join(apiDep.rootDir, 'lib', 'default-routes.json'))
      } catch { /* no defaults */ }
    }
    if (authDep) {
      try {
        authDefaultRoutes = await readJson(path.join(authDep.rootDir, 'lib', 'default-routes.json'))
      } catch { /* no defaults */ }
      // Core auth routes mounted at /api/auth
      try {
        const coreAuthConfig = await readJson(path.join(authDep.rootDir, 'lib', 'routes.json'))
        authRouter = {
          path: '/api/auth',
          routes: (coreAuthConfig.routes || []).map(r => this.#staticRouteEntry(r)),
          childRouters: []
        }
        apiRouter.childRouters.push(authRouter)
      } catch { /* no auth routes */ }
    }

    // Process each dependency's routes.json
    for (const dep of Object.values(this.dependencies)) {
      if (dep.module === false) continue
      let config
      try {
        config = await readJson(path.join(dep.rootDir, 'routes.json'))
      } catch {
        continue
      }
      if (config.type !== undefined) {
        // Auth-type module (e.g. auth-local)
        await this.#addAuthTypeRouter(config, dep, authRouter, authDefaultRoutes)
      } else if (config.root) {
        // API module
        this.#addApiRouter(config, apiRouter, apiDefaultRoutes)
      }
    }
    return apiRouter
  }

  #addApiRouter (config, parentRouter, defaultRoutes) {
    const root = config.root
    const scope = config.permissionsScope || root
    const schemaName = config.schemaName ?? root
    const collectionName = config.collectionName ?? root

    let routes = config.routes || []

    // Merge with default routes unless explicitly disabled
    if (config.useDefaultRoutes !== false && defaultRoutes) {
      routes = this.#mergeWithDefaults(routes, defaultRoutes.routes || [])
    }

    /* eslint-disable no-template-curly-in-string */
    const replacements = {
      '${scope}': scope,
      '${schemaName}': schemaName,
      '${collectionName}': collectionName
    }
    /* eslint-enable no-template-curly-in-string */

    const childRouter = {
      path: `/api/${root}`,
      routes: routes.map(r => this.#staticRouteEntry(this.#replacePlaceholders(r, replacements))),
      childRouters: []
    }
    parentRouter.childRouters.push(childRouter)
  }

  async #addAuthTypeRouter (config, dep, authRouter, defaultRoutes) {
    if (!authRouter) return
    const type = config.type
    let routes = config.routes || []

    if (defaultRoutes) {
      routes = this.#mergeWithDefaults(routes, defaultRoutes.routes || [])
    }

    const childRouter = {
      path: `/api/auth/${type}`,
      routes: routes.map(r => this.#staticRouteEntry(r)),
      childRouters: []
    }
    authRouter.childRouters.push(childRouter)
  }

  #mergeWithDefaults (customRoutes, defaultRoutes) {
    const overrides = new Map(
      customRoutes.filter(r => r.override).map(r => [r.route, r])
    )
    const matched = new Set()
    const mergedDefaults = defaultRoutes.map(d => {
      const o = overrides.get(d.route)
      if (!o) return d
      matched.add(d.route)
      const { override, ...rest } = o
      return { ...d, ...rest, handlers: { ...d.handlers, ...rest.handlers } }
    })
    const remaining = customRoutes.filter(r => !r.override || !matched.has(r.route))
    return [...mergedDefaults, ...remaining]
  }

  #staticRouteEntry (routeDef) {
    const handlers = {}
    if (routeDef.handlers) {
      for (const method of Object.keys(routeDef.handlers)) {
        handlers[method] = () => {}
      }
    }
    return {
      route: routeDef.route,
      handlers,
      meta: routeDef.meta || {},
      internal: routeDef.internal || false,
      permissions: routeDef.permissions || {}
    }
  }

  // ------- permissions -------

  #buildPermissions (routerTree) {
    const store = { get: [], post: [], put: [], patch: [], delete: [] }
    this.#walkRouterPermissions(routerTree, store)
    return store
  }

  #walkRouterPermissions (router, store) {
    for (const routeDef of router.routes) {
      const fullRoute = `${router.path}${routeDef.route !== '/' ? routeDef.route : ''}`
      for (const [method, scopes] of Object.entries(routeDef.permissions || {})) {
        if (scopes === null) continue
        const m = method.toLowerCase()
        if (!store[m]) continue
        try {
          const { regexp } = pathToRegexp(fullRoute)
          store[m].push([regexp, scopes])
        } catch {
          // skip routes that can't be compiled (unusual patterns)
        }
      }
    }
    for (const child of router.childRouters) {
      this.#walkRouterPermissions(child, store)
    }
  }

  // ------- placeholder replacement (mirrors AbstractApiModule) -------

  #replacePlaceholders (obj, replacements) {
    if (typeof obj === 'string') {
      return Object.entries(replacements).reduce(
        (s, [k, v]) => v != null ? s.replaceAll(k, v) : s,
        obj
      )
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.#replacePlaceholders(item, replacements))
    }
    if (obj && typeof obj === 'object' && obj.constructor === Object) {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, this.#replacePlaceholders(v, replacements)])
      )
    }
    return obj
  }
}

export default StaticAppContext
