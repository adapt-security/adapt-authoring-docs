const async = require('async');
const esdoc = require('esdoc').default;
const fs = require('fs-extra');
const glob = require('glob');
const open = require('open');
const path = require('path');
const { App, Utils } = require('adapt-authoring-core');

const processCwd = process.cwd();
const config = require(path.join(processCwd, 'conf', `${process.env.NODE_ENV}.config.js`));
const pkg = require(path.join(processCwd, 'package.json'));
const outputdir = path.join(__dirname, "build");

let manualIndex; // populated in cacheConfigs
let sourceIndex; // populated in cacheConfigs
let cachedConfigs;

const getConfig = () => {
  return {
    source: Utils.getModuleDir(),
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
        name: "esdoc-publish-html-plugin",
        option: { template: path.join(__dirname, "template") }
      },
      { name: "esdoc-node" },
      { name: getPluginPath("externals.js") },
      { name: getPluginPath("coreplugins.js") },
      { name: getPluginPath("configuration.js") }
    ]
  };
}
/**
* Caches loaded JSON so we don't load multiple times.
* Documentation for a module can be enabled in:
* package.json > adapt_authoring.documentation.enable
*/
function cacheConfigs() {
  const cache = [];
  Object.keys(App.instance.dependencies).forEach(dep => {
    const depDir = resolveModDir(dep);
    let c;
    try {
      c = getDocConfig(depDir);
    } catch(e) { // couldn't read the config but don't need to do anything
      return console.log(`Omitting ${dep}, config is invalid: ${e.message}`);
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
    cache.push({ ...c, ...{ name: dep, includes: c.includes || {} }});
  });
  return cache;
}
/**
* Returns a list of modules to include.
* @note Source files must be located in /lib
* @hack do externals.js better...
*/
function getSourceIncludes() {
  return cachedConfigs.reduce((i, c) => {
    return i.concat(getModFiles(c.name, path.join('lib', '*')));
  }, ['^externals.js$']);
}
/**
* Returns a list of markdown files to include in the manual is found.
* @note No index files are included (if defined)
*/
function getManualIncludes() {
  const rootIncludes = [];
  try {
    rootIncludes.push(...getModFiles(processCwd, pkg.adapt_authoring.documentation.includes.docs));
  } catch(e) {} // no root doc files
  return rootIncludes.concat(cachedConfigs.reduce((i, c) => {
    if(!c.includes.docs) return i; // don't include docs by default
    i.concat(getModFiles(c.name, path.join('docs', '*')).filter(filterIndexManuals));
  }, []));
}

function filterIndexManuals(filepath, index) {
  return index !== manualIndex && index !== sourceIndex;
}

function getDocConfig(depDir) {
  let dPkg;
  try {
    dPkg = fs.readJsonSync(path.join(depDir, 'package.json'));
  } catch(e) {
    throw new Error('No package.json');
  }
  if(!dPkg.adapt_authoring) {
    throw new Error(`No 'adapt_authoring' settings specified`);
  }
  if(!dPkg.adapt_authoring.documentation) {
    throw new Error(`No 'documentation' settings specified`);
  }
  return dPkg.adapt_authoring.documentation;
}

function getModFiles(mod, includes, relative = false) {
  const globFiles = glob.sync(includes, { cwd: resolveModDir(mod), absolute: true });
  if(relative) {
    const root = resolveModDir();
    globFiles = globFiles.map(f => `^${path.relative(root, f)}`);
  }
  return globFiles;
}

function resolveModDir(mod, ...args) {
  return path.join(Utils.getModuleDir(mod), ...args);
}

function getPluginPath(pluginName) {
  return path.join(__dirname, "plugins", pluginName);
}

const __log = console.log;
console.log = (...args) => {
  if(!args.toString().match(/^parse|resolve|output:/)) __log(...args);
};

function docs() {
  console.log(`Generating documentation for ${pkg.name}@${pkg.version}`);

  cachedConfigs = cacheConfigs();
  const config = getConfig();

  console.log(`\nThis might take a minute or two...\n`);

  esdoc.generate(config);

  console.log(`Documentation build complete.`);

  const docspath = path.join(path.resolve(config.destination), 'index.html');
  if(process.env.aat_open) {
    open(docspath);
  } else {
    console.log(`\nDocs can be launched from '${docspath}'\n(tip: pass the --open flag when calling this command to open automatically in a browser window)`);
  }
}

module.exports = docs;
