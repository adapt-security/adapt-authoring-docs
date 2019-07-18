const async = require('async');
const esdoc = require('esdoc').default;
const fs = require('fs-extra');
const glob = require('glob');
const open = require('open');
const path = require('path');

const config = require(path.join(process.cwd(), 'conf', `${process.env.NODE_ENV}.config.js`));
const cwd = config && config.app && config.app.local_modules_path || path.join(process.cwd(), 'node_modules');
const pkg = require(path.join(process.cwd(), 'package.json'));
const outputdir = path.join(__dirname, "build");

const defaultSourceIncludes = `!(node_modules)${path.sep}*.js`;

let manualIndex; // populated in cacheConfigs
let sourceIndex; // populated in cacheConfigs

const cachedConfigs = cacheConfigs();

const esconfig = {
  source: cwd,
  destination: outputdir,
  includes: getSourceIncludes(),
  index: sourceIndex,
  plugins: [
    {
      name: "esdoc-standard-plugin",
      option: {
        accessor: {
          access: ["public", "protected"]
        },
        brand: {
          title: "Adapt authoring tool"
        },
        manual: {
          index: manualIndex,
          files: getManualIncludes()
        }
      }
    },
    {
      name: "esdoc-importpath-plugin",
      option: {
        stripPackageName: true,
        replaces: [
          { "from": "node_modules/", "to": "" }
        ]
      }
    },
    {
      name: "esdoc-publish-html-plugin",
      option: { template: path.join(__dirname, "template") }
    },
    { name: "esdoc-node" },
    { name: getPluginDir("externals.js") },
    { name: getPluginDir("coreplugins.js") },
    { name: getPluginDir("configuration.js") }
  ]
};
function getPluginDir(pluginName) {
  return path.join(__dirname, "plugins", pluginName);
}
/**
* Caches loaded JSON so we don't load multiple times.
* Documentation for a module can be enabled in:
* package.json > adapt_authoring.documentation.enable
*/
function cacheConfigs() {
  const cache = [];
  Object.keys(Object.assign({}, pkg.dependencies, pkg.devDependencies)).forEach(dep => {
    const depDir = path.join(cwd, dep);
    let c;
    try {
      const pkg = fs.readJsonSync(path.join(depDir, 'package.json'));
      if(!pkg.adapt_authoring) {
        throw new Error(`No 'adapt_authoring' settings specified`);
      }
      if(!pkg.adapt_authoring.documentation) {
        throw new Error(`No 'documentation' settings specified`);
      }
      c = pkg.adapt_authoring.documentation;
    } catch(e) { // couldn't read the pkg attribute but don't need to do anything
      return console.log(`Omitting ${dep}, config is invalid: ${e}`);
    }
    if(!c.enable) {
      return console.log(`Omitting ${dep}, adapt_authoring.documentation.enable is false`);
    }
    if(c.manualIndex) {
      if(manualIndex) return console.log(`${dep}: manualIndex has been specified by another module as ${manualIndex}`);
      manualIndex = path.join(depDir, c.manualIndex);
    }
    if(c.sourceIndex) {
      if(sourceIndex) return console.log(`${dep}: sourceIndex has been specified by another module as ${sourceIndex}`);
      sourceIndex = path.join(depDir, c.sourceIndex);
    }
    cache.push(Object.assign(c, { name: dep, includes: c.includes || {} }));
  });
  return cache;
}
/**
* Returns a list of modules to include.
* defaultDocsIncludes is used if no adapt_authoring.documentation.includes.docs
* is found.
*/
function getSourceIncludes() {
  return cachedConfigs.reduce((i, c) => {
    const include = path.join(cwd, c.name, (c.includes.source || defaultSourceIncludes));
    return i.concat(glob.sync(include).map(p => `^${p.replace(cwd,'').slice(1)}`));
  }, []).concat(['^externals.js$']); // HACK include temp file created by our 'externals-plugin'...fix this
}
/**
* Returns a list of markdown files to include in the manual
* defaultDocsIncludes is used if no adapt_authoring.documentation.includes.docs
* is found.
*/
function getManualIncludes() {
  const rootIncludes = [];
  try {
    rootIncludes.push(...glob.sync(path.join(process.cwd(), pkg.adapt_authoring.documentation.includes.docs)));
  } catch(e) {} // do nothing

  return rootIncludes.concat(cachedConfigs.reduce((i, c) => {
    if(!c.includes.docs) return i; // don't include docs by default
    const include = path.join(cwd, c.name, c.includes.docs || defaultDocsIncludes);
    return i.concat(glob.sync(include).filter(i => i !== manualIndex && i !== sourceIndex));
  }, []));
}

function docs() {
  console.log(`\nGenerating documentation using modules at ${cwd}\nThis might take a minute or two...\n`);
  esdoc.generate(esconfig);

  console.log(`Documentation build complete.`);

  const docspath = path.join(path.resolve(esconfig.destination), 'index.html');
  if(process.env.aat_open) {
    open(docspath);
  } else {
    console.log(`\nDocs can be launched from '${docspath}'\n(tip: pass the --open flag when calling this command to open automatically in a browser window)`);

  }
}

const __log = console.log;
console.log = (...args) => {
  if(!args.toString().match(/^parse|resolve|output:/)) __log(...args);
 }

module.exports = docs;
