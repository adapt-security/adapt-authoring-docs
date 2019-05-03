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

const esconfig = {
  source: localModulesPath || path.join(process.cwd(), "./node_modules"),
  destination: outputdir,
  includes: getIncludes(),
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
* Creates a list of modules to include
* Documentation for a module can be enabled in
* package.json > adapt_authoring.documentation.enable
*/
function getIncludes() {
  let includes = [];
  Object.keys(pkg.dependencies).forEach(dep => {
    try {
      const basedir = path.join(cwd, dep);
      const docConfig = fs.readJsonSync(path.join(basedir, 'package.json')).adapt_authoring.documentation;

      if(!docConfig.enable) return;

      let include = path.join(basedir, docConfig.include || `!(node_modules)${path.sep}*.js`);
      includes = includes.concat(glob.sync(include));

    } catch(e) {} // couldn't read the pkg attribute but don't need to do anything
  });
  // HACK include temp file created by our 'externals-plugin'...fix this
  includes.push('externals.js$');
  return includes;
}

function docs() {
  console.log('Generating documentation...\n');
  esdoc.generate(esconfig);
  console.log(`\nDone.\nDocs can be launched from '${path.join(path.resolve(esconfig.destination), 'index.html')}'\n`);
}

module.exports = docs;
