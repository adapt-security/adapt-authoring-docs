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
  const titleMap = configs.reduce((m,c) => {
    const customFiles = [];
    if(c.manualPlugins) {
      c.manualPlugins.forEach(p => {
        try {
          const Plugin = require(path.resolve(c.rootDir, p));
          const plugin = new Plugin(app, c, dir);
          if(plugin.customFiles) customFiles.push(...plugin.customFiles);
        } catch(e) {
          console.log(`Failed to load doc manual plugin, ${e}`);
        }
      });
    }
    [...customFiles, ...glob.sync('docs/*.md', { cwd: c.rootDir, absolute: true })].forEach(f => {
      if(f === sourceIndex) {
        return;
      }
      let title = path.basename(f);
      let sectionName = c.manualSections && c.manualSections[title] ? c.manualSections[title] : defaultSection;

      if(!sectionsConf[sectionName]) sectionsConf[sectionName] = {}
      if(!sectionsConf[sectionName].pages) sectionsConf[sectionName].pages = [];
      
      sectionsConf[sectionName].pages.push(title);

      m[title] = { path: f, title };
      try { 
        m[title].title = fs.readFileSync(f).toString().match(/^#(?!#)\s?(.*)/)[1]; 
      } catch(e) {}
    });
    return m;
  }, {});
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
    .forEach(([id, { title, pages }]) => {
      if(!pages || !pages.length) {
        return;
      }
      sidebarMd += `\n\n<ul class="header"><li>${title}</li></ul>\n\n`;
      pages
        .sort((a,b) => a.localeCompare(b))
        .filter(f => {
          const p = titleMap[f].path;
          return p !== manualIndex && p !== sourceIndex;
        })
        .forEach(f => sidebarMd += `  - [${titleMap[f].title}](${f})\n`);
    });

  console.log(sidebarMd);

  await fs.writeFile(`${dir}/_sidebar.md`, sidebarMd);
}

module.exports = docsify;