import { readJson } from 'adapt-authoring-core'
import { loadDependencies, loadConfigDefaults, loadSchemas, loadErrors, buildRouterTree, buildPermissions } from './docsData.js'
import docsify from '../docsify/docsify.js'
import fs from 'fs/promises'
import jsdoc3 from '../jsdoc3/jsdoc3.js'
import path from 'path'
import swagger from '../swagger/swagger.js'

/**
 * Caches loaded JSON so we don't load multiple times, and collects the default
 * manual/source pages contributed by modules. Documentation for a module can be
 * enabled in package.json > adapt_authoring.documentation.enable.
 * @param {Object} appData
 * @param {Object} defaultPages Mutated with any pages a module contributes
 * @return {Array<Object>}
 */
function cacheConfigs (appData, defaultPages) {
  const cache = []
  const excludes = appData.pkg.documentation.excludes ?? []
  Object.values(appData.dependencies).forEach(dep => {
    const c = dep.documentation

    let omitMsg
    if (!c) omitMsg = 'no documentation config defined'
    else if (!c.enable) omitMsg = 'documentation.enable is set to false'
    else if (excludes.includes(dep.name)) omitMsg = 'module has been excluded in documentation config'
    if (omitMsg) return console.log(`Omitting ${dep.name}, ${omitMsg}`)

    Object.keys(defaultPages).forEach(p => {
      if (!c[p]) return
      if (defaultPages[p]) return console.log(`${dep.name}: ${p} has been specified by another module as ${defaultPages[p]}`)
      defaultPages[p] = path.join(dep.rootDir, c[p]).split(path.sep).join(path.posix.sep)
    })

    cache.push({
      ...c,
      name: dep.name,
      version: dep.version,
      module: dep.module !== false,
      rootDir: dep.rootDir,
      includes: c.includes || {}
    })
  })
  cache.push({
    ...appData.pkg.documentation,
    enable: true,
    name: 'adapt-authoring',
    rootDir: appData.rootDir,
    includes: {}
  })
  return cache
}

async function copyRootFiles (outputdir) {
  const resolve = p => new URL(`../${p}`, import.meta.url)
  await fs.cp(resolve('/root'), outputdir, { recursive: true })
  await fs.cp(resolve('assets'), path.resolve(outputdir, 'assets'), { recursive: true })
}

/**
 * Generates the documentation for the modules installed under a root directory.
 * @param {Object} [options]
 * @param {String} [options.rootDir] Application root to document (default: `process.cwd()`)
 * @param {String} [options.outputDir] Directory to write the build to (default: the `adapt-authoring-docs.outputDir` config value)
 * @param {Boolean} [options.verbose] Enable verbose logging
 * @return {Promise<String>} The resolved output directory
 */
export default async function buildDocs ({ rootDir, outputDir, verbose = false } = {}) {
  rootDir = path.resolve(rootDir || process.cwd())

  const defaultPages = {
    manualCover: undefined,
    manualIndex: undefined,
    sourceIndex: undefined
  }

  const dependencies = await loadDependencies(rootDir)
  const pkg = { ...await readJson(path.join(rootDir, 'package.json')), ...await readJson(path.join(rootDir, 'adapt-authoring.json')) }
  const config = await loadConfigDefaults(rootDir, dependencies)
  const schemas = await loadSchemas(dependencies)
  const errors = await loadErrors(dependencies)
  const routerTree = await buildRouterTree(dependencies)
  const permissions = buildPermissions(routerTree)

  const appData = {
    rootDir,
    pkg,
    dependencies,
    config,
    errors,
    schemas,
    routerTree,
    permissions
  }

  console.log(`Generating documentation for ${appData.pkg.name}@${appData.pkg.version}${verbose ? ' :: DEBUG' : ''}`)

  const { name } = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url)))
  const outputdir = path.resolve(process.cwd(), outputDir || appData.config.get(`${name}.outputDir`))

  const cachedConfigs = cacheConfigs(appData, defaultPages)

  console.log('\nThis might take a minute or two...\n')

  await fs.rm(outputdir, { recursive: true, force: true })
  await fs.mkdir(outputdir, { recursive: true })
  await copyRootFiles(outputdir)
  await jsdoc3(appData, cachedConfigs, outputdir, defaultPages)
  await docsify(appData, cachedConfigs, outputdir, defaultPages)
  await swagger(appData, cachedConfigs, outputdir)

  console.log('Documentation build complete.')
  return outputdir
}
