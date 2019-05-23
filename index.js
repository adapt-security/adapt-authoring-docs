const async = require('async');
const esdoc = require('esdoc').default;
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

let localModulesPath;
try { localModulesPath = require(path.join(process.cwd(), '.dev.json')).localModulesPath; } catch(e) {}

const cwd = localModulesPath ? localModulesPath : path.join(process.cwd(), 'node_modules');
const pkg = require(path.join(process.cwd(), 'package.json'));
const outputdir = path.join(__dirname, "build");

const defaultSourceIncludes = `!(node_modules)${path.sep}*.js`;
const defaultDocsIncludes = path.join('docs', '*.md');

const manualDir = path.resolve(path.join(__dirname, 'manual'));
const manualIndex = path.resolve(path.join(manualDir, 'index.md'));

const cachedConfigs = cacheConfigs();

const esconfig = {
  source: localModulesPath || path.join(process.cwd(), "./node_modules"),
  destination: outputdir,
  includes: getSourceIncludes(),
  index: path.join(__dirname, "INDEX.md"),
  plugins: [
    {
      name: "esdoc-standard-plugin",
      option: {
        accessor: {
          access: ["public", "protected"]
        },
        brand: {
          title: "Adapt authoring tool",
          logo: path.join(__dirname, "assets", "logo.png")
        }
      }
    },
    {
      name: "esdoc-integrate-manual-plugin-fork",
      option: {
        index: manualIndex,
        files: getManualIncludes()
      }
    },
    { name: "esdoc-node" },
    { name: path.resolve(path.join(__dirname, "externals-plugin.js")) },
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
      name: "esdoc-inject-style-plugin",
      option: {
        styles: [path.join(__dirname, "assets", "adapt.css")]
      }
    }
  ]
};
/**
* Caches loaded JSON so we don't load multiple times.
* Documentation for a module can be enabled in:
* package.json > adapt_authoring.documentation.enable
*/
function cacheConfigs() {
  const cache = [];
  Object.keys(pkg.dependencies).forEach(dep => {
    let config;
    let include = false;
    try {
      config = fs.readJsonSync(path.join(cwd, dep, 'package.json')).adapt_authoring.documentation;
      include = config.enable;
    } catch(e) { // couldn't read the pkg attribute but don't need to do anything
      return console.log(`Omitting ${dep}, config is invalid: ${e}`);
    }
    if(!include) {
      return console.log(`Omitting ${dep}, adapt_authoring.documentation.enable is false`);
    }
    cache.push(Object.assign(config, { name: dep, includes: config.includes || {} }));
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
  let includes = glob.sync(path.join(manualDir, '*.md')).filter(p => p !== manualIndex);
  return cachedConfigs.reduce((i, c) => i.concat(glob.sync(path.join(cwd, c.name, c.includes.docs || defaultDocsIncludes))), includes);
}

function docs() {
  console.log('Generating documentation...\n');
  esdoc.generate(esconfig);
  console.log(`\nDone.\nDocs can be launched from '${path.join(path.resolve(esconfig.destination), 'index.html')}'\n`);
}

module.exports = docs;
