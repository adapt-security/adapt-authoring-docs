import DocsifyPluginWrapper from './DocsifyPluginWrapper.js'
import { exec } from 'child_process'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'
import { globSync } from 'glob'
import path from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

function resolvePath (relativePath) {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

// Capitalise and convert dashes to spaces
function generateSectionTitle (sectionName) {
  return sectionName[0].toUpperCase() + sectionName.slice(1).replaceAll('-', ' ')
}

/**
 * Copies all doc files ready for the generator
 */
export default async function docsify (appData, configs, outputdir, defaultPages) {
  const dir = path.resolve(outputdir, 'manual')
  const sectionsConf = appData.config.get('adapt-authoring-docs.manualSections')
  const defaultSection = Object.entries(sectionsConf).find(([, data]) => data.default)?.[0]
  /**
   * init docsify folder
   */
  await execPromise(`npx docsify init ${dir}`)
  /**
   * Collate data & run custom plugins
   */
  const titleMap = {}
  await Promise.all(configs.map(async c => {
    const customFiles = []
    if (c.manualPlugins) {
      await Promise.all(c.manualPlugins.map(async p => {
        try {
          const wrapper = await new DocsifyPluginWrapper({
            ...c,
            app: appData,
            docsRootDir: outputdir,
            pluginEntry: path.resolve(c.rootDir, p),
            outputDir: dir
          })
          await wrapper.init()
          customFiles.push(...wrapper.customFiles)
        } catch (e) {
          console.log(`Failed to load ${c.name} doc manual plugin ${path.basename(p)}, ${e}`)
        }
      }))
    }
    if (c.manualSections) {
      Object.entries(c.manualSections).forEach(([key, data]) => {
        if (!sectionsConf[key]) sectionsConf[key] = data
      })
    }
    [...customFiles, ...globSync('docs/*.md', { cwd: c.rootDir, absolute: true })].forEach(f => {
      if (f === defaultPages.sourceIndex) {
        return
      }
      const title = path.basename(f)
      const sectionName = c.manualPages?.[title] ?? defaultSection

      if (!sectionsConf[sectionName]) sectionsConf[sectionName] = {}
      if (!sectionsConf[sectionName].title) sectionsConf[sectionName].title = generateSectionTitle(sectionName)
      if (!sectionsConf[sectionName].pages) sectionsConf[sectionName].pages = []

      sectionsConf[sectionName].pages.push(title)

      titleMap[title] = { path: f, title }
      try {
        titleMap[title].title = fs.readFileSync(f).toString().match(/^#(?!#)\s?(.*)/)[1]
      } catch (e) {}
    })
  }))
  /**
   * Copy files
   */
  await fs.copy(resolvePath('./index.html'), `${dir}/index.html`)
  await fs.copy(resolvePath('../assets'), `${dir}/assets`)
  await fs.copy(resolvePath('./js'), `${dir}/js`)
  await fs.copy(resolvePath('./styles'), `${dir}/styles`)

  // add Docsify options
  const f = `${dir}/js/adapt.js`
  const contents = (await fs.readFile(f)).toString()
  await fs.writeFile(f, contents.replace('OPTIONS', JSON.stringify({
    name: '<img class="logo" src="assets/logo-outline-colour.png" />Adapt authoring tool<h2>Developer guides</h2>',
    repo: 'https://github.com/adapt-security/adapt-authoring',
    themeColor: '#36cde8',
    loadSidebar: true,
    loadNavbar: false,
    autoHeader: true,
    coverpage: defaultPages.manualCover ? path.basename(defaultPages.manualCover) : false,
    homepage: defaultPages.manualIndex ? path.basename(defaultPages.manualIndex) : false
  })))

  await Promise.allSettled(Object.entries(titleMap).map(([filename, v]) => fs.copy(v.path, `${dir}/${filename}`)))
  /**
   * Generate custom sidebar
   */
  let sidebarMd = '<ul class="intro"><li><a href="#/" title="Introduction">Introduction</a></li></ul>'
  Object.entries(sectionsConf)
    .forEach(([id, { title, pages = [] }]) => {
      const filtered = pages.filter(f => titleMap[f]?.path)
      if (!filtered || !filtered.length) {
        return
      }
      sidebarMd += `\n\n<ul class="header"><li>${title}</li></ul>\n\n`
      filtered
        .sort((a, b) => a.localeCompare(b))
        .forEach(f => {
          sidebarMd += `  - [${titleMap[f].title}](${f})\n`
        })
    })

  await fs.writeFile(`${dir}/_sidebar.md`, sidebarMd)
}
