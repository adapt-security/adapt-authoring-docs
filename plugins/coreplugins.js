const fs = require('fs-extra');
const path = require('path');

const pkg = require(path.join(process.cwd(), 'package.json'));

class Plugin {
  onHandleConfig(ev) {
    let content = ``;
    Object.entries(Object.assign({}, pkg.dependencies, pkg.devDependencies)).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([dep, v]) => {
      const { name, version, description, homepage, adapt_authoring } = require('.' + path.join(process.cwd(), 'node_modules', dep, 'package.json'))
      if(!adapt_authoring) {
        return;
      }
      content += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${adapt_authoring.module || false} | ${description} |\n`;
    });
    const input = fs.readFileSync(path.join(__dirname, '..', 'docspartials', 'coreplugins.md')).toString();
    const output = input.replace('{{{REPLACE_ME}}}', content);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'temp-coreplugins.md'), output);
  }
}

module.exports = new Plugin();
