const fs = require('fs-extra');
const glob = require('glob');
const { promisify } = require('util');

const execPromise = promisify(require('child_process').exec);

const configPath = `${__dirname}/.jsdocConfig.json`;

let cachedConfigs;

async function writeConfig(app, outputdir, indexFile) {
  return fs.writeFile(configPath, JSON.stringify({
    "source": { 
      "include": getSourceIncludes(indexFile) 
    },
    "docdash": {
      "collapse": true,
      "typedefs": true,
      "search": false,
      "static": true,
      "menu": {
        [`<img class="logo" src="assets/logo-colour.png" />Adapt authoring tool API documentation<br><span class="version">v${app.pkg.version}</span>`]: {
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
        "keyword": `v${app.pkg.version}`
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
  }, null, 2));
}
/**
 * Returns a list of modules to include.
 * @note Source files must be located in /lib
 */
function getSourceIncludes(indexFile) {
  const includes = cachedConfigs.reduce((i, c) => {
    return i.concat(glob.sync('lib/**/*.js', { cwd: c.rootDir, absolute: true }));
  }, []);
  if(indexFile) includes.push(indexFile);
  return includes;
}

async function jsdoc3(app, configs, outputdir, sourceIndexFile) {
  cachedConfigs = configs;
  const dir = `${outputdir}/jsdoc3`;
  await writeConfig(app, dir, sourceIndexFile);
  await execPromise(`npx jsdoc -c ${configPath}`);
  await Promise.all([
    fs.copy(`${__dirname}/styles/adapt.css`, `${dir}/styles/adapt.css`),
    fs.copy(`${__dirname}/scripts/adapt.js`, `${dir}/scripts/adapt.js`),
    fs.copy(`${__dirname}/../assets`, `${dir}/assets`)
  ]);
}

module.exports = jsdoc3;