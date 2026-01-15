import { exec } from 'child_process'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'
import { globSync } from 'glob'
import { promisify } from 'util'

const execPromise = promisify(exec)

const configPath = resolvePath('.jsdocConfig.json')

let cachedConfigs

function resolvePath (relativePath) {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

async function writeConfig (app, outputdir, indexFile) {
  return fs.writeFile(configPath, JSON.stringify({
    source: {
      include: getSourceIncludes(indexFile)
    },
    docdash: {
      collapse: true,
      typedefs: true,
      search: true,
      static: true,
      menu: {
        [`<img class="logo" src="assets/logo-outline-colour.png" />Adapt authoring tool back-end API documentation<br><span class="version">v${app.pkg.version}</span>`]: {
          class: 'menu-title'
        },
        'Documentation home': {
          href: 'https://adapt-security.github.io/adapt-authoring-documentation/',
          target: '_self',
          class: 'menu-item',
          id: 'home_link'
        },
        'Project Website': {
          href: 'https://www.adaptlearning.org/',
          target: '_blank',
          class: 'menu-item',
          id: 'website_link'
        },
        'Technical Discussion Forum': {
          href: 'https://community.adaptlearning.org/mod/forum/view.php?id=4',
          target: '_blank',
          class: 'menu-item',
          id: 'forum_link'
        }
      },
      sectionOrder: [ // Order the main section in the navbar (default order shown here)
        'Namespaces',
        'Classes',
        'Modules',
        'Externals',
        'Events',
        'Mixins',
        'Tutorials',
        'Interfaces'
      ],
      meta: {
        title: 'Adapt authoring tool UI documentation',
        description: 'Adapt authoring tool UI documentation',
        keyword: `v${app.pkg.version}`
      },
      scripts: [
        'styles/adapt.css',
        'scripts/adapt.js'
      ]
    },
    opts: {
      destination: outputdir,
      template: 'node_modules/docdash'
    }
  }, null, 2))
}
/**
 * Returns a list of modules to include.
 * @note Source files must be located in /lib
 */
function getSourceIncludes (indexFile) {
  const includes = cachedConfigs.reduce((i, c) => {
    return i.concat(
      ...globSync('lib/**/*.js', { cwd: c.rootDir, absolute: true }),
      ...(c.module ? globSync('index.js', { cwd: c.rootDir, absolute: true }) : [])
    )
  }, [])
  if (indexFile) includes.push(indexFile)
  return includes
}

export default async function jsdoc3 (app, configs, outputdir, sourceIndexFile) {
  cachedConfigs = configs
  const dir = `${outputdir}/backend`
  await writeConfig(app, dir, sourceIndexFile)
  try {
    await execPromise(`npx jsdoc -c ${configPath}`)
  } catch (e) {
    console.log(e.stderr)
    throw new Error('JSDoc exited with errors. See above for details.')
  }
  await Promise.all([
    fs.copy(resolvePath('./styles/adapt.css'), `${dir}/styles/adapt.css`),
    fs.copy(resolvePath('./scripts/adapt.js'), `${dir}/scripts/adapt.js`),
    fs.copy(resolvePath('../assets'), `${dir}/assets`)
  ])
}
