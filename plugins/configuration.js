const fs = require('fs-extra');
const path = require('path');

const pkg = require(path.join(process.cwd(), 'package.json'));
const schemas = [];

class Plugin {
  onHandleConfig(ev) {
    this.loadSchemas();
    this.writeFile({
      'CODE_EXAMPLE': this.generateCodeExample(),
      'LIST': this.generateList()
    });
  }
  loadSchemas() {
    Object.keys(Object.assign({}, pkg.dependencies, pkg.devDependencies)).forEach(dep => {
      try {
        schemas[dep] = require('.' + path.join(process.cwd(), 'node_modules', dep, 'conf', 'config.schema.js')).definition;
      } catch(e) {
        return;
      }
    });
  }
  generateCodeExample() {
    let output = '\`\`\`javascript\nmodule.exports = {\n';

    Object.entries(schemas).forEach(([dep, schema]) => {
      output += `  '${dep}': {\n`;
      Object.entries(schema).forEach(([attr, config]) => {
        if(config.description) output += `    // ${config.description}\n`;
        if(config.help) output += `    // ${config.help}\n`;
        output += `    ${attr}: ${this.defaultToMd(config)} // ${config.type}, ${config.required ? 'required' : 'optional'}\n`;
      });
      output += `  }\n`;
    });
    output += `};\n\`\`\``;

    return output;
  }
  generateList() {
    let output = '';

    Object.entries(schemas).forEach(([dep, schema]) => {
      output += `### ${dep}\n\n`
      Object.entries(schema).forEach(([attr, config]) => {
        output += `**${attr}** (${config.type || ''}, ${config.required ? 'required' : 'optional'})<br>`;
        output += `${config.description}\n\n`;
        output += `Default: \`${this.defaultToMd(config)}\`\n\n`;
      });
      output += `***\n\n`;
    });

    return output;
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

  writeFile(data) {
    let file = fs.readFileSync(path.join(__dirname, '..', 'docspartials', 'configuration.md')).toString();
    Object.entries(data).forEach(([key,value]) => file = file.replace(`{{{${key}}}}`, value));
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'temp-configuration.md'), file);
  }
}

module.exports = new Plugin();
