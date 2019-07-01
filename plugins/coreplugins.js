const fs = require('fs-extra');
const path = require('path');

const pkg = require(path.join(process.cwd(), 'package.json'));

class Plugin {
  onHandleConfig(ev) {
    let output = `# List of core modules\n**The following modules are included in Adapt authoring v${pkg.version}, and supported by the core dev team.**\n\nThe 'Module' column refers to whether the dependency is booted as an authoring tool module, or simply used as a regular Node dependency (see [this page](module-definition.html) for more information).\n\n| Name | Version | Module | Description |\n| ---- | :-----: | :----: | ----------- |\n`;
    Object.entries(Object.assign({}, pkg.dependencies, pkg.devDependencies)).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([dep, v]) => {
      const { name, version, description, homepage, adapt_authoring } = this.getDepPkg(dep);
      if(!adapt_authoring) {
        return;
      }
      /*
      if(!adapt_authoring || !adapt_authoring.module) {
        console.log(`Omitting ${dep} from 'List of core modules', not a module`);
        return;
      }
      */
      output += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${adapt_authoring.module || false} | ${description} |\n`;
    });
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'coreplugins.md'), output);
  }

  getDepPkg(dep) {
    try {
      return require('.' + process.env.aat_local_modules_path, dep, 'package.json');
    } catch(e) {}
    try {
      return require('.' + path.join(process.cwd(), 'node_modules', dep, 'package.json'));
    } catch(e) {}
  }
}

module.exports = new Plugin();
