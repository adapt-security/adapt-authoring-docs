const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const { promisify } = require('util');

const execPromise = promisify(require('child_process').exec);

/**
 * Copies all doc files ready for the generator
 */
async function docsify(configs, outputdir) {
  let sidebarMd = '';
  const files = configs.reduce((allFiles, c) => {
    const docFiles = glob.sync('docs/*.md', { cwd: c.rootDir, absolute: true });
    if(docFiles.length) {
      sidebarMd += `* ${c.name}\n`;
      docFiles.forEach(f => {
        let title = path.basename(f);
        try {
          title = fs.readFileSync(f).toString().match(/^#(?!#)\s?(.*)/)[1];
        } catch(e) {}
        sidebarMd += `  * [${title}](${path.basename(f)})\n`;
      });
    }
    return allFiles.concat(docFiles);
  }, []);
  const dir = path.resolve(`${outputdir}/docsify`);
  await execPromise(`npx docsify init ${dir}`);
  await fs.writeFile(`${dir}/_sidebar.md`, sidebarMd);
  await fs.copy(`${__dirname}/index.html`, `${dir}/index.html`);
  await Promise.all(files.map(f => fs.copy(f, `${dir}/${path.basename(f)}`)));
}

module.exports = docsify;