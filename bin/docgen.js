#!/usr/bin/env node
/**
 * Generates documentation for the installed modules.
 */
import { readJson } from 'adapt-authoring-core'
import { loadDependencies, loadConfigDefaults, loadSchemas, loadErrors, buildRouterTree, buildPermissions } from '../lib/docsData.js'
import docsify from '../docsify/docsify.js'
import fs from 'fs/promises'
import jsdoc3 from '../jsdoc3/jsdoc3.js'
import path from 'path'
import swagger from '../swagger/swagger.js'

const DEBUG = process.argv.includes('--verbose')

function getArg (name) {
  const idx = process.argv.indexOf(name)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined
}

const rootDir = path.resolve(getArg('--rootDir') || process.cwd())

let outputdir

const defaultPages = { // populated in cacheConfigs
  manualCover: undefined,
  manualIndex: undefined,
  sourceIndex: undefined
}
/**
* Caches loaded JSON so we don't load multiple times.
* Documentation for a module can be enabled in:
* package.json > adapt_authoring.documentation.enable
*/
function cacheConfigs (app) {
  const cache = []
  const excludes = app.pkg.documentation.excludes ?? []
  Object.values(app.dependencies).forEach(dep => {
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
    ...app.pkg.documentation,
    enable: true,
    name: 'adapt-authoring',
    rootDir: app.rootDir,
    includes: {}
  })
  return cache
}

async function copyRootFiles () {
  const resolve = p => new URL(`../${p}`, import.meta.url)
  await fs.cp(resolve('/root'), outputdir, { recursive: true })
  await fs.cp(resolve('assets'), path.resolve(outputdir, 'assets'), { recursive: true })
}

async function docs () {
  const dependencies = await loadDependencies(rootDir)
  const pkg = { ...await readJson(path.join(rootDir, 'package.json')), ...await readJson(path.join(rootDir, 'adapt-authoring.json')) }
  const config = await loadConfigDefaults(dependencies)
  const schemas = await loadSchemas(dependencies)
  const errors = await loadErrors(dependencies)
  const routerTree = await buildRouterTree(dependencies)
  const permissions = buildPermissions(routerTree)

  const app = {
    rootDir,
    pkg,
    dependencies,
    config,
    errors,
    schemas,
    routerTree,
    permissions
  }

  console.log(`Generating documentation for ${app.pkg.name}@${app.pkg.version} ${DEBUG ? ' :: DEBUG' : ''}`)

  const { name } = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url)))
  outputdir = path.resolve(process.cwd(), getArg('--outputDir') || app.config.get(`${name}.outputDir`))

  const cachedConfigs = cacheConfigs(app)

  console.log('\nThis might take a minute or two...\n')

  try {
    await fs.rm(outputdir, { recursive: true, force: true })
    await fs.mkdir(outputdir)
    await copyRootFiles()
    await jsdoc3(app, cachedConfigs, outputdir, defaultPages)
    await docsify(app, cachedConfigs, outputdir, defaultPages)
    await swagger(app, cachedConfigs, outputdir)
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
  console.log('Documentation build complete.')
  process.exit()
}

export default docs()
