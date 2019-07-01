const fs = require('fs-extra');
const path = require('path');
const externals = require('../externals');

const externalsFilename = 'externals.js';
let externalsOut = '';

class Plugin {
  onHandleConfig(ev) {
    this._config = ev.data.config;
    this._option = ev.data.option || {};
    if (!('enable' in this._option)) this._option.enable = true;

    if (!this._option.enable) return;

    externalsOut = path.resolve(this._config.source, externalsFilename);
    // write temp file
    fs.writeFileSync(externalsOut, Object.keys(externals).reduce((memo, key) => memo += `/** @external {${key}} ${externals[key]} */\n`, ''));

    this.writeManualFile();
  }

  onHandleDocs(ev) {
    if (!this._option.enable) return;
    // remove temp file
    fs.removeSync(externalsOut);
    // set all externals as builtinExternal
    const name = path.basename(path.resolve(this._config.source)) + '/' + externalsFilename;
    for (const doc of ev.data.docs) {
      if (doc.kind === 'external' && doc.memberof === name) doc.builtinExternal = true;
    }
    const tagIndex = ev.data.docs.findIndex(doc => doc.kind === 'file' && doc.name === name);
    ev.data.docs.splice(tagIndex, 1);
  }

  writeManualFile() {
    let output = '# External type reference\nBelow is a list of types which will automatically link to their official documentation when included in ESDoc comments.\n\n| Name | Link |\n| ---- | ---- |\n';
    Object.entries(externals).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([name, link]) => output += `| ${name} | ${link} |\n`);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'externals.md'), output);
  }
}

module.exports = new Plugin();
