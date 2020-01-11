const fs = require('fs-extra');
const path = require('path');
const { App } = require('adapt-authoring-core');

class Plugin {
  onHandleConfig(ev) {
    let content = ``;
    Object.entries(App.instance.dependencies).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([name, config]) => {
      const { version, description, homepage } = config;
      content += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${config.module || true} | ${description} |\n`;
    });
    const input = fs.readFileSync(path.join(__dirname, '..', 'docspartials', 'coreplugins.md')).toString();
    const output = input.replace('{{{REPLACE_ME}}}', content);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'temp-coreplugins.md'), output);
  }
}

module.exports = new Plugin();
