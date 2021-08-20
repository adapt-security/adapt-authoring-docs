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
      try { title = fs.readFileSync(f).toString().match(/^#(?!#)\s?(.*)/)[1]; } catch(e) {}
      m[title] = f;
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
  await Promise.allSettled(Object.values(titleMap).map(f => fs.copy(f, `${dir}/${path.basename(f)}`)));
  /**
   * Generate custom sidebar
   */
  let sidebarMd = '';

  const sidebarData = [
    {
      header: 'Guides',
      pages: Object.keys(titleMap)
        .sort((a,b) => a.localeCompare(b))
        .filter(t => titleMap[t] !== manualIndex)
        .map(t => [t, path.basename(titleMap[t])])
    },
    {
      header: 'Useful links',
      pages: [
        ['Project website', 'https://www.adaptlearning.org'],
        ['Official forum', 'https://community.adaptlearning.org'],
        ['Gitter chatrooms', 'https://gitter.im/adaptlearning/home']
      ]
    }
  ];
  sidebarData.forEach(({ header, pages }) => {
    sidebarMd += `\n\n<ul class="header"><li>${header}</li></ul>\n\n`;
    pages.forEach(([text,link]) => sidebarMd += `  - [${text}](${link})\n`);
  });
  await fs.writeFile(`${dir}/_sidebar.md`, sidebarMd);
}

module.exports = docsify;