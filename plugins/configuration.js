const fs = require('fs-extra');
const path = require('path');

const pkg = require(path.join(process.cwd(), 'package.json'));

class Plugin {
  onHandleConfig(ev) {
    let output = '\`\`\`javascript\nmodule.exports = {\n';
    Object.entries(Object.assign({}, pkg.dependencies, pkg.devDependencies)).forEach(([dep, v]) => {
      let schema
      try {
        schema = require('.' + path.join(process.cwd(), 'node_modules', dep, 'conf', 'config.schema.js')).definition;
      } catch(e) {
        return;
      }
      output += `  '${dep}': {\n`;
      Object.entries(schema).forEach(([attr, config]) => {
        if(config.description) output += `    // ${config.description}\n`;
        if(config.help) output += `    // ${config.help}\n`;
        output += `    ${attr}: ${this.defaultToMd(config)} // (${config.type}) ${config.required ? 'required' : 'optional'}\n`;
      });
      output += `  }\n`;
    });
    output += `};\n\`\`\``;

    this.writeFile(output);
  }
  /**
  * Returns a string formatted nicely for markdown
  */
  defaultToMd(config) {
    if(config.default === undefined) {
      return config.default;
    }
    switch(config.type.toLowerCase()) {
      case 'array':
        return `[${config.default}]`;
      case 'string':
        return `"${config.default}"`;
      default:
        return config.default;
    }
  }

  writeFile(content) {
    const input = fs.readFileSync(path.join(__dirname, '..', 'docspartials', 'configuration.md')).toString();
    const output = input.replace('{{{REPLACE_ME}}}', content);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'temp-configuration.md'), output);
  }
}

module.exports = new Plugin();
