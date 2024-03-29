#!/usr/bin/env node
/**
 * Generates documentation for the installed modules.
 */
import { App } from 'adapt-authoring-core';
import docsify from '../docsify/docsify.js';
import fs from 'fs/promises';
import jsdoc3 from '../jsdoc3/jsdoc3.js';
import path from 'path';
import swagger from '../swagger/swagger.js';

process.env.NODE_ENV ??= 'production';
process.env.ADAPT_AUTHORING_LOGGER__mute = true

const app = App.instance;
let outputdir;

let manualIndex; // populated in cacheConfigs
let sourceIndex; // populated in cacheConfigs
/**
* Caches loaded JSON so we don't load multiple times.
* Documentation for a module can be enabled in:
* package.json > adapt_authoring.documentation.enable
*/
function cacheConfigs() {
  const cache = [];
  const excludes = app.pkg.documentation.excludes ?? [];
  Object.values(app.dependencies).forEach(dep => {
    const c = dep.documentation;
    
    let omitMsg;
    if(!c) omitMsg = `no documentation config defined`;
    else if(!c.enable) omitMsg = `documentation.enable is set to false`;
    else if(excludes.includes(dep.name)) omitMsg = `module has been excluded in documentation config`;
    if(omitMsg) return console.log(`Omitting ${dep.name}, ${omitMsg}`);
    
    if(c.manualIndex) {
      if(manualIndex) return console.log(`${dep.name}: manualIndex has been specified by another module as ${manualIndex}`);
      manualIndex = path.join(dep.rootDir, c.manualIndex).split(path.sep).join(path.posix.sep);
    }
    if(c.sourceIndex) {
      if(sourceIndex) return console.log(`${dep.name}: sourceIndex has been specified by another module as ${sourceIndex}`);
      sourceIndex = path.join(dep.rootDir, c.sourceIndex).split(path.sep).join(path.posix.sep);
    }
    cache.push({ 
      ...c, 
      name: dep.name,
      version: dep.version,
      module: !!app.dependencyloader.instances[dep.name],
      rootDir: dep.rootDir,
      includes: c.includes || {}
    });
  });
  cache.push({ 
    ...app.pkg.documentation, 
    enable: true, 
    name: 'adapt-authoring', 
    rootDir: app.rootDir, 
    includes: {} 
  });
  return cache;
}

async function copyRootFiles() {
  const resolve = p => new URL(`../${p}`, import.meta.url);
  await fs.cp(resolve('/root'), outputdir, { recursive: true });
  await fs.cp(resolve('assets'), path.resolve(outputdir, 'assets'), { recursive: true });
}

async function docs() {
  console.log(`Generating documentation for ${app.pkg.name}@${app.pkg.version}`);

  try {
    await app.onReady();
  } catch(e) {
    console.log(`App failed to start, cannot continue.\n${e}`);
    process.exit(1);
  }
  const config = await app.waitForModule('config');
  const { name } = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url)));
  outputdir = path.resolve(process.cwd(), config.get(`${name}.outputDir`));

  const cachedConfigs = cacheConfigs();

  console.log(`\nThis might take a minute or two...\n`);

  try {
    await fs.rm(outputdir, { recursive: true, force: true });
    await fs.mkdir(outputdir);
    await copyRootFiles();
    await jsdoc3(app, cachedConfigs, outputdir, sourceIndex);
    await docsify(app, cachedConfigs, outputdir, manualIndex, sourceIndex);
    await swagger(app, cachedConfigs, outputdir);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }
  console.log(`Documentation build complete.`);
  process.exit();
}

export default docs();