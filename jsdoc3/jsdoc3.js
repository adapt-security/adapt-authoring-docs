const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const { promisify } = require('util');

const execPromise = promisify(require('child_process').exec);

const configPath = `${__dirname}/.jsdocConfig.json`;

let pkg;
let cachedConfigs;

async function writeConfig() {
  return fs.writeJson(configPath, {
    "source": { 
      "include": getSourceIncludes() 
    },
    "docdash": {
      "collapse": true,
      "typedefs": true,
      "search": false,
      "static": true,
      "menu": {
        [`<img class="logo" src="assets/logo-colour.png" />Adapt authoring tool API documentation<br><span class="version">v${pkg.version}</span>`]: {
          "class":"menu-title"
        },
        "Home": {
          "href":"index.html",
          "target":"_self",
          "class":"menu-item",
          "id":"home_link"
        },
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
        "title": "Adapt authoring tool API documentation",
        "keyword": `v${pkg.version}`
      },
      "scripts": [
        'styles/adapt.css',
        'scripts/adapt.js'
      ],
    },
    "opts": {
      "destination": outputdir,
      "template": "node_modules/docdash"
    }
  }, { spaces: 2 });
}
/**
 * Returns a list of modules to include.
 * @note Source files must be located in /lib
 */
function getSourceIncludes() {
  return cachedConfigs.reduce((i, c) => {
    return i.concat(getModFiles(c.rootDir, path.join('lib/**/*.js'), false));
  }, [sourceIndex]);
}

function getModFiles(modDir, includes) {
  return glob.sync(includes, { cwd: modDir, absolute: true });
}

async function jsdoc3(configs, outputdir, packageJson) {
  cachedConfigs = configs;
  pkg = packageJson;
  await writeConfig();
  await execPromise(`npx jsdoc -c ${configPath}`);
  const dir = `${outputdir}/jsdoc3`;
  await Promise.all([
    fs.copy(`${__dirname}/styles/adapt.css`, `${dir}/styles/adapt.css`),
    fs.copy(`${__dirname}/scripts/adapt.js`, `${dir}/scripts/adapt.js`),
    fs.copy(`${__dirname}/assets`, `${dir}/assets`)
  ]);
}

module.exports = jsdoc3;