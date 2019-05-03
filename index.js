const async = require('async');
const esdoc = require('esdoc').default;
const fs = require('fs-extra');
const minimatch = require('minimatch');
const path = require('path');

const pkg = require('../package.json');

console.log(path.join(process.cwd(), 'dev.json'));

let localModulesPath;
try { localModulesPath = require(path.join(process.cwd(), 'dev.json')).localModulesPath; } catch(e) {}

const esconfig = {
  source: localModulesPath || "./node_modules",
  destination: "./docs/build",
  includes: getIncludes(),
  index: "./docs/INDEX.md",
  plugins: [
    {
      name: "esdoc-standard-plugin",
      option: {
        accessor: {
          access: ["public", "protected"]
        },
        brand: {
          title: "Adapt authoring tool",
          logo: "./docs/logo.png",
          icon: "./docs/favicon.png"
        }
      }
    },
    { name: "esdoc-node" },
    { name: "./docs/externals-plugin" },
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
        styles: ["./docs/adapt.css"]
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
    const depPkgDir = localModulesPath ?
      path.join(localModulesPath, dep, 'package.json') :
      path.join(process.cwd(), 'node_modules', dep, 'package.json');

    try {
      const docConfig = fs.readJsonSync(depPkgDir).adapt_authoring.documentation;
      if(!docConfig.enable) {
        return;
      }
      if(docConfig.include) {
        console.log(minimatch);
      }
      includes.push(`^${dep}\/(?!node_modules).+\.js$`);
    } catch(e) {} // couldn't read the pkg attribute but don't need to do anything
  });
  // HACK include temp file created by our 'externals-plugin'...fix this
  includes.push('externals.js$');
  console.log(includes);
  process.exit();
  return includes;
}

function docs() {
  console.log('Generating documentation...\n');
  esdoc.generate(esconfig);
  console.log(`\nDone.\nDocs can be launched from '${path.join(path.resolve(config.destination), 'index.html')}'\n`);
}

module.exports = docs;
