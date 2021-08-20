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
  Object.keys(titleMap)
    .sort((a,b) => a.localeCompare(b))
    .forEach(n => {
      if(titleMap[n] !== manualIndex) {
        sidebarMd += `* [${n}](${path.basename(titleMap[n])})\n`;
      }
    });

  await fs.writeFile(`${dir}/_sidebar.md`, sidebarMd);
}

module.exports = docsify;