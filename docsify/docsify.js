const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const { promisify } = require('util');

const execPromise = promisify(require('child_process').exec);

/**
 * Copies all doc files ready for the generator
 */
async function docsify(app, configs, outputdir, manualIndex, sourceIndex) {
  const dir = `${outputdir}/docsify`;
  const sectionsConf = app.config.get('adapt-authoring-docs.manualSections');
  const defaultSection = Object.entries(sectionsConf).reduce((m,[id,data]) => data.default ? id : m);
  /**
   * init docsify folder
   */
  await execPromise(`npx docsify init ${dir}`);
  /**
   * Collate data & run custom plugins
   */
  const titleMap = {};
  await Promise.all(configs.map(async c => {
    const customFiles = [];
    if(c.manualPlugins) {
      await Promise.all(c.manualPlugins.map(async p => {
        try {
          const Plugin = require(path.resolve(c.rootDir, p));
          const plugin = new Plugin(app, c, dir);
          if(typeof plugin.run === 'function') await plugin.run();
          if(plugin.customFiles) customFiles.push(...plugin.customFiles);
        } catch(e) {
          console.log(`Failed to load doc manual plugin, ${e}`);
        }
      }));
    }
    if(c.manualSections) {
      Object.entries(c.manualSections).forEach(([key, data]) => {
        if(!sectionsConf[key]) sectionsConf[key] = data
      });
    } 
    [...customFiles, ...glob.sync('docs/*.md', { cwd: c.rootDir, absolute: true })].forEach(f => {
      if(f === sourceIndex) {
        return;
      }
      let title = path.basename(f);
      let sectionName = c.manualPages && c.manualPages[title] ? c.manualPages[title] : defaultSection;

      if(!sectionsConf[sectionName]) sectionsConf[sectionName] = {}
      if(!sectionsConf[sectionName].pages) sectionsConf[sectionName].pages = [];
      
      sectionsConf[sectionName].pages.push(title);

      titleMap[title] = { path: f, title };
      try { 
        titleMap[title].title = fs.readFileSync(f).toString().match(/^#(?!#)\s?(.*)/)[1]; 
      } catch(e) {}
    });
  }));
  /**
   * Copy files
   */
  await fs.copy(`${__dirname}/index.html`, `${dir}/index.html`);
  await fs.copy(`${__dirname}/styles`, `${dir}/styles`);
  await fs.copy(`${__dirname}/../assets`, `${dir}/assets`);
  if(manualIndex) {
    await fs.copy(manualIndex, `${dir}/_coverpage.md`);
  }
  await Promise.allSettled(Object.entries(titleMap).map(([filename, v]) => fs.copy(v.path, `${dir}/${filename}`)));
  /**
   * Generate custom sidebar
   */
  let sidebarMd = '';
  Object.entries(sectionsConf)
    .forEach(([id, { title, pages = [] }]) => {
      const filtered = pages.filter(f => {
        const p = titleMap[f].path;
        return p !== manualIndex && p !== sourceIndex;
      });
      if(!filtered || !filtered.length) {
        return;
      }
      sidebarMd += `\n\n<ul class="header"><li>${title}</li></ul>\n\n`;
      filtered
        .sort((a,b) => a.localeCompare(b))
        .forEach(f => sidebarMd += `  - [${titleMap[f].title}](${f})\n`);
    });

  await fs.writeFile(`${dir}/_sidebar.md`, sidebarMd);
}

module.exports = docsify;