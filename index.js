const fs = require('fs-extra');
const glob = require('glob');
const open = require('open');
const path = require('path');
const { promisify } = require('util');
const { App, Utils } = require('adapt-authoring-core');

const execPromise = promisify(require('child_process').exec);

const app = App.instance;
const configPath = `${__dirname}/jsdocConfig.json`;
let outputdir;

let pkg;
let manualIndex; // populated in cacheConfigs
let sourceIndex; // populated in cacheConfigs
let cachedConfigs;

async function writeConfig() {
  return fs.writeJson(configPath, {
    "plugins": [],
    "source": { 
      "include": getSourceIncludes() 
    },
    "docdash": {
      "collapse": true,
      "typedefs": true,
      "menu": {
        "Project Website": {
          "href":"https://www.adaptlearning.org/",
          "target":"_blank",
          "class":"menu-item",
          "id":"website_link"
        },
        "Technical Discussion Forum": {
          "href":"https://community.adaptlearning.org/mod/forum/view.php?id=4",
          "target":"_blank",
          "class":"menu-item",
          "id":"forum_link"
        }
      },
      "meta": {
        "title": "Adapt authoring tool API documentation"
      },
      "scripts": ['styles/adapt.css'],
    },
    "opts": {
      "destination": outputdir,
      "template": "node_modules/docdash"
    }
  }, { spaces: 2 });
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
  }, []);
}
/**
 * Returns a list of markdown files to include in the manual is found.
 * @note No index files are included (if defined)
 */
/*
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
*/
/*
function filterIndexManuals(filepath, index) {
  return index !== manualIndex && index !== sourceIndex;
}
*/
function getModFiles(modDir, includes) {
  return glob.sync(includes, { cwd: modDir, absolute: true });
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
  outputdir = path.resolve(process.cwd(), config.get(`${require('./package.json').name}.outputDir`));

  cachedConfigs = cacheConfigs();

  console.log(`\nThis might take a minute or two...\n`);

  await writeConfig();
  try {
    await fs.remove(outputdir);
    await execPromise(`npx jsdoc -c ${configPath}`);
    await fs.copy(`${__dirname}/styles/adapt.css`, `${outputdir}/styles/adapt.css`);
    await fs.copy(`${__dirname}/assets`, `${outputdir}/assets`);
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

module.exports = docs;