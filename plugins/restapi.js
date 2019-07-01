const fs = require('fs-extra');
const path = require('path');

class Plugin {
  onHandleConfig(ev) {
    console.log(ev.data.config);
  }

  onHandleConfig(ev) {
    console.log(ev.data.config);
  }

  onPublish(ev) {
    // ev.data.writeFile(filePath, content);
  }
}

module.exports = new Plugin();
