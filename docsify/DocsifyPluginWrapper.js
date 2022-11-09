import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
/**
 * Utility functions to be used by Docsify plugins
 */
 export default class DocsifyPluginWrapper {
  constructor(config) {
    this.config = config;
    this.config.srcDir = path.dirname(config.pluginEntry);
  }
  async init() {
    const PluginClass = (await import(pathToFileURL(this.config.pluginEntry))).default;
    this.plugin = new PluginClass();
    this.plugin.app = this.config.app;
    this.plugin.config = this.config;

    if(!this.plugin.run || typeof this.plugin.run !== 'function') throw new Error(`Documentation plugin must define a 'run' function`);

    await this.plugin.run();
    // set some default values
    this.plugin.contents ??= [];
    this.plugin.customFiles ??= [];
    this.plugin.replace ??= {};
    
    if(this.plugin.manualFile) await this.writeFile();
  }
  generateTOC(items) {
    const pageName = this.plugin?.manualFile?.replace(path.extname(this.plugin.manualFile), '') ?? '';
    let output = '### Quick navigation\n\n<ul class="toc">\n';
    items.forEach(i => {
      let text = i, link = i;
      if(Array.isArray(i)) {
        text = i[0];
        link = i[1];
      }
      output += `<li><a href="#/${pageName}?id=${link}">${text}</a></li>\n`;
    });
    output += '</ul>\n';
    return output;
  }
  async writeFile() {
    if(this.plugin.contents.length) {
      this.plugin.replace['TABLE_OF_CONTENTS'] = this.generateTOC(this.plugin.contents);
    }
    const filePath = path.resolve(this.config.srcDir, this.plugin.manualFile);
    let file;
    try {
      file = fs.readFileSync(filePath).toString();
    } catch(e) {
      throw new Error(`Failed to load manual file at ${filePath}`);
    }
    // do any specified string replacements
    file = Object.entries(this.plugin.replace).reduce((f, [key, value]) => f.replaceAll(`{{{${key}}}}`, value), file);

    const outputPath = path.join(this.config.outputDir, this.plugin.manualFile);
    this.plugin.customFiles.push(outputPath);
    fs.writeFileSync(outputPath, file);
  }
}