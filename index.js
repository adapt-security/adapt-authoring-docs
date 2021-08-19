#!/usr/bin/env node
const fs = require('fs-extra');
const open = require('open');
const path = require('path');
const { App, Utils } = require('adapt-authoring-core');
const jsdoc3 = require('./jsdoc3/jsdoc3');
const docsify = require('./docsify/docsify');

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
  Object.values(App.instance.dependencies).forEach(dep => {
    const c = dep.documentation;
    if(!c || !c.enable) {
      return console.log(`Omitting ${dep.name}, no documentation config defined, or documentation.enable is set to false`);
    }
    if(c.manualIndex) {
      if(manualIndex) return console.log(`${dep.name}: manualIndex has been specified by another module as ${manualIndex}`);
      manualIndex = path.join(dep.rootDir, c.manualIndex);
    }
    if(c.sourceIndex) {
      if(sourceIndex) return console.log(`${dep.name}: sourceIndex has been specified by another module as ${sourceIndex}`);
      sourceIndex = path.join(dep.rootDir, c.sourceIndex);
    }
    cache.push({ ...c, name: dep.name, rootDir: dep.rootDir, includes: c.includes || {} });
  });
  return cache;
}

const __log = console.log;
console.log = (...args) => {
  if(!args.toString().match(/^parse|resolve|output:/)) __log(...args);
};

async function docs() {
  const pkg = await Utils.requirePackage();

  console.log(`Generating documentation for ${pkg.name}@${pkg.version}`);

  await app.onReady();

  const config = await app.waitForModule('config');
  outputdir = path.resolve(process.cwd(), config.get(`${require('./package.json').name}.outputDir`));

  const cachedConfigs = cacheConfigs();

  console.log(`\nThis might take a minute or two...\n`);

  try {
    await fs.remove(outputdir);
    await jsdoc3(cachedConfigs, outputdir, pkg);
    await docsify(cachedConfigs, outputdir, manualIndex, sourceIndex);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }

  console.log(`Documentation build complete.`);

  const docspath = path.join(`${outputdir}/index.html`);
  if(process.env.aat_open) {
    open(docspath);
  } else {
    console.log(`\nDocs can be launched from file://${docspath}\n(tip: pass the --open flag when calling this command to open automatically in a browser window)`);
  }
  process.exit();
}

module.exports = docs();