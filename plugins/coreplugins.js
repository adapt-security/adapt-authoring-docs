const fs = require('fs-extra');
const path = require('path');
const { App, Utils } = require('adapt-authoring-core');

const pkg = require(path.join(process.cwd(), 'package.json'));

class Plugin {
  onHandleConfig(ev) {
    let content = ``;
    Object.entries(App.instance.dependencies).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([dep]) => {
      const { name, version, description, homepage, adapt_authoring } = getModPkg(dep);
      if(!adapt_authoring) {
        return;
      }
      content += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${adapt_authoring.module || false} | ${adapt_authoring.utility || ''} | ${description} |\n`;
    });
    const input = fs.readFileSync(path.join(__dirname, '..', 'docspartials', 'coreplugins.md')).toString();
    const output = input.replace('{{{REPLACE_ME}}}', content);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'temp-coreplugins.md'), output);
  }
}

function getModPkg(mod) {
  try {
    return require(path.join(Utils.getModuleDir(mod), 'package.json'));
  } catch(e) {
    return {};
  }
}

module.exports = new Plugin();
