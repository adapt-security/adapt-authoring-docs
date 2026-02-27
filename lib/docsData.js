import { loadDependencyFiles, readJson } from 'adapt-authoring-core'
import { glob } from 'glob'
import os from 'os'
import path from 'path'
import { pathToRegexp } from 'path-to-regexp'

/**
 * Globs node_modules for adapt-authoring.json files, merges each with its
 * package.json and returns a { [name]: config } map.
 * @param {string} rootDir Absolute path to the app root
 * @returns {Promise<Object>}
 */
export async function loadDependencies (rootDir) {
  const files = await glob('node_modules/**/adapt-authoring.json', {
    cwd: rootDir,
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

/**
 * Reads conf/config.schema.json from each dependency, extracts default values,
 * and returns a { get(key) } object. Resolves $TEMP to os.tmpdir().
 * @param {Object} dependencies Dependencies map from loadDependencies
 * @returns {Promise<Object>}
 */
export async function loadConfigDefaults (dependencies) {
  const allConfigs = await loadDependencyFiles('conf/config.schema.json', {
    parse: true,
    dependencies
  })
  const defaults = {}
  for (const [depName, [schema]] of Object.entries(allConfigs)) {
    const props = schema.properties || {}
    const modDefaults = {}
    for (const [key, prop] of Object.entries(props)) {
      if (prop.default !== undefined) modDefaults[key] = prop.default
    }
    if (Object.keys(modDefaults).length) defaults[depName] = modDefaults
  }
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

/**
 * Loads and merges all schema/*.schema.json files across dependencies.
 * @param {Object} dependencies Dependencies map from loadDependencies
 * @returns {Promise<Object>} { schemas, raw, getSchema }
 */
export async function loadSchemas (dependencies) {
  const allSchemas = await loadDependencyFiles('schema/*.schema.json', {
    parse: true,
    dependencies
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

/**
 * Loads and merges all errors/*.json files across dependencies.
 * @param {Object} dependencies Dependencies map from loadDependencies
 * @returns {Promise<Object>} Merged error map
 */
export async function loadErrors (dependencies) {
  const allErrors = await loadDependencyFiles('errors/*.json', {
    parse: true,
    dependencies
  })
  const merged = {}
  for (const arr of Object.values(allErrors)) {
    for (const obj of arr) Object.assign(merged, obj)
  }
  // Match the AdaptError shape that plugins expect:
  // { code, statusCode, meta: { description, data } }
  return Object.entries(merged)
    .sort()
    .reduce((m, [code, { description, statusCode, data }]) => {
      const meta = { description }
      if (data) meta.data = data
      m[code] = { code, statusCode, meta }
      return m
    }, {})
}

/**
 * Reads routes.json files from dependencies and assembles an Express-like
 * { path, routes, childRouters } tree rooted at /api.
 * @param {Object} dependencies Dependencies map from loadDependencies
 * @returns {Promise<Object>} Router tree
 */
export async function buildRouterTree (dependencies) {
  const apiRouter = { path: '/api', routes: [], childRouters: [] }
  let authRouter = null
  let apiDefaultRoutes = null
  let authDefaultRoutes = null

  const authDep = dependencies['adapt-authoring-auth']
  const apiDep = dependencies['adapt-authoring-api']

  if (apiDep) {
    try {
      apiDefaultRoutes = await readJson(path.join(apiDep.rootDir, 'lib', 'default-routes.json'))
    } catch { /* no defaults */ }
  }
  if (authDep) {
    try {
      authDefaultRoutes = await readJson(path.join(authDep.rootDir, 'lib', 'default-routes.json'))
    } catch { /* no defaults */ }
    try {
      const coreAuthConfig = await readJson(path.join(authDep.rootDir, 'lib', 'routes.json'))
      authRouter = {
        path: '/api/auth',
        routes: (coreAuthConfig.routes || []).map(r => staticRouteEntry(r)),
        childRouters: []
      }
      apiRouter.childRouters.push(authRouter)
    } catch { /* no auth routes */ }
  }

  const allRoutes = await loadDependencyFiles('routes.json', {
    parse: true,
    dependencies
  })
  for (const [depName, [config]] of Object.entries(allRoutes)) {
    if (dependencies[depName].module === false) continue
    if (config.type !== undefined) {
      addAuthTypeRouter(config, authRouter, authDefaultRoutes)
    } else if (config.root) {
      addApiRouter(config, apiRouter, apiDefaultRoutes)
    }
  }
  return apiRouter
}

/**
 * Walks the router tree and builds a permission store with
 * { get: [], post: [], ... } arrays of [regexp, scopes] tuples.
 * @param {Object} routerTree Router tree from buildRouterTree
 * @returns {Object} Permission store
 */
export function buildPermissions (routerTree) {
  const store = { get: [], post: [], put: [], patch: [], delete: [] }
  walkRouterPermissions(routerTree, store)
  return store
}

// ------- internal helpers -------

function addApiRouter (config, parentRouter, defaultRoutes) {
  const root = config.root
  const scope = config.permissionsScope || root
  const schemaName = config.schemaName ?? root
  const collectionName = config.collectionName ?? root

  let routes = config.routes || []

  if (config.useDefaultRoutes !== false && defaultRoutes) {
    routes = mergeWithDefaults(routes, defaultRoutes.routes || [])
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
    routes: routes.map(r => staticRouteEntry(replacePlaceholders(r, replacements))),
    childRouters: []
  }
  parentRouter.childRouters.push(childRouter)
}

function addAuthTypeRouter (config, authRouter, defaultRoutes) {
  if (!authRouter) return
  const type = config.type
  let routes = config.routes || []

  if (defaultRoutes) {
    routes = mergeWithDefaults(routes, defaultRoutes.routes || [])
  }

  const childRouter = {
    path: `/api/auth/${type}`,
    routes: routes.map(r => staticRouteEntry(r)),
    childRouters: []
  }
  authRouter.childRouters.push(childRouter)
}

function mergeWithDefaults (customRoutes, defaultRoutes) {
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

function staticRouteEntry (routeDef) {
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

function walkRouterPermissions (router, store) {
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
    walkRouterPermissions(child, store)
  }
}

function replacePlaceholders (obj, replacements) {
  if (typeof obj === 'string') {
    return Object.entries(replacements).reduce(
      (s, [k, v]) => v != null ? s.replaceAll(k, v) : s,
      obj
    )
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replacePlaceholders(item, replacements))
  }
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, replacePlaceholders(v, replacements)])
    )
  }
  return obj
}
