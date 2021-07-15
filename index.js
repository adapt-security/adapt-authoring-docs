/* eslint no-console: 0 */
const esdoc = require('esdoc').default;
const glob = require('glob');
const open = require('open');
const path = require('path');
const { App, Utils } = require('adapt-authoring-core');

const app = App.instance;
let modsDir;
let outputdir;

let pkg;
let manualIndex; // populated in cacheConfigs
let sourceIndex; // populated in cacheConfigs
let cachedConfigs;

function getConfig() {
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
        name: "esdoc-ecmascript-proposal-plugin",
        option: { all: true }
      },
      {
        name: "esdoc-publish-html-plugin",
        option: { template: path.join(__dirname, "template") }
      },
      { name: "esdoc-node" },
      { name: getPluginPath("externals.js") },
      ...getPluginConfig()
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
/**
 * Returns a list of modules to include.
 * @note Source files must be located in /lib
 * @hack do externals.js better...
 */
function getSourceIncludes() {
  return cachedConfigs.reduce((i, c) => {
    return i.concat(getModFiles(c.rootDir, path.join('lib/**/*.js'), false));
  }, ['^externals.js$']);
}
/**
 * Returns a list of markdown files to include in the manual is found.
 * @note No index files are included (if defined)
 */
function getManualIncludes() {
  const includes = 'docs/*.md';
  const rootIncludes = [];
  try {
    rootIncludes.push(...getModFiles(process.cwd(), includes));
  } catch(e) {} // no root doc files
  return rootIncludes.concat(cachedConfigs.reduce((i, c) => {
    return i.concat(getModFiles(c.rootDir, includes).filter(filterIndexManuals));
  }, []));
}
function getPluginConfig() {
  const globFiles = getModFiles(modsDir, '*/docs/plugins/*.js');
  return globFiles.map(f => Object.assign({ name: f }));
}

function filterIndexManuals(filepath, index) {
  return index !== manualIndex && index !== sourceIndex;
}

function getModFiles(modDir, includes, absolute = true) {
  const globFiles = glob.sync(includes, { cwd: modDir, absolute });
  if(absolute) {
    return globFiles;
  }
  return globFiles.map(f => `^${modDir.replace(modsDir, '')}${path.sep}${f}`);
}

function getPluginPath(pluginName) {
  return path.join(__dirname, "plugins", pluginName);
}

const __log = console.log;
console.log = (...args) => {
  if(!args.toString().match(/^parse|resolve|output:/)) __log(...args);
};

async function docs() {
  pkg = await Utils.requirePackage();

  console.log(`Generating documentation for ${pkg.name}@${pkg.version}`);

  await app.onReady();

  const config = await app.waitForModule('config');
  outputdir = config.get(`${require('./package.json').name}.outputDir`);
  modsDir = `${app.rootDir}/node_modules/`;

  cachedConfigs = cacheConfigs();

  console.log(`\nThis might take a minute or two...\n`);

  const esconfig = getConfig();
  try {
    esdoc.generate(esconfig);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }

  console.log(`Documentation build complete.`);

  const docspath = path.join(path.resolve(esconfig.destination), 'index.html');
  if(process.env.aat_open) {
    open(docspath);
  } else {
    console.log(`\nDocs can be launched from '${docspath}'\n(tip: pass the --open flag when calling this command to open automatically in a browser window)`);
  }
  process.exit();
}

module.exports = docs;
