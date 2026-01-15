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

/**
 * Copies all doc files ready for the generator
 */
export default async function docsify (app, configs, outputdir, manualIndex, sourceIndex) {
  const dir = path.resolve(outputdir, 'manual')
  const sectionsConf = app.config.get('adapt-authoring-docs.manualSections')
  const defaultSection = Object.entries(sectionsConf).reduce((m, [id, data]) => data.default ? id : m)
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
            app,
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
      if (f === sourceIndex) {
        return
      }
      const title = path.basename(f)
      const sectionName = c.manualPages && c.manualPages[title] ? c.manualPages[title] : defaultSection

      if (!sectionsConf[sectionName]) sectionsConf[sectionName] = {}
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
  if (manualIndex) {
    await fs.copy(manualIndex, `${dir}/_coverpage.md`)
  }
  await Promise.allSettled(Object.entries(titleMap).map(([filename, v]) => fs.copy(v.path, `${dir}/${filename}`)))
  /**
   * Generate custom sidebar
   */
  let sidebarMd = ''
  Object.entries(sectionsConf)
    .forEach(([id, { title, pages = [] }]) => {
      const filtered = pages.filter(f => {
        const p = titleMap[f].path
        return p !== manualIndex && p !== sourceIndex
      })
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
