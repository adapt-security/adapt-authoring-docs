const fs = require('fs-extra');
const path = require('path');
let externals;

const externalsFilename = 'externals.js';
let externalsOut = '';

class Plugin {
  onHandleConfig(ev) {
    this._config = ev.data.config;
    this._option = ev.data.option || {};
    if(!('enable' in this._option)) this._option.enable = true;

    if(!this._option.enable) return;

    externalsOut = path.resolve(this._config.source, externalsFilename);
    // write temp file
    fs.writeFileSync(externalsOut, Object.keys(externals).reduce((memo, key) => memo += `/** @external {${key}} ${externals[key]} */\n`, ''));

    this.writeManualFile();
  }
  onHandleDocs(ev) {
    if(!this._option.enable) return;
    // remove temp file
    fs.removeSync(externalsOut);
    // set all externals as builtinExternal
    const name = `${path.basename(path.resolve(this._config.source))}/${externalsFilename}`;
    for(const doc of ev.data.docs) {
      if(doc.kind === 'external' && doc.memberof === name) doc.builtinExternal = true;
    }
    const tagIndex = ev.data.docs.findIndex(doc => doc.kind === 'file' && doc.name === name);
    ev.data.docs.splice(tagIndex, 1);
  }
  writeManualFile() {
    let content = '';
    Object.entries(externals).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([name, link]) => content += `| ${name} | ${link} |\n`);
    const input = fs.readFileSync(path.join(__dirname, 'externals.md')).toString();
    const output = input.replace('{{{REPLACE_ME}}}', content);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'temp-externals.md'), output);
  }
}
/**
 * The following can be used as datatypes
 */
externals = {
/**
 * Mozilla
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
 */
  'Infinity': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Infinity',
  'NaN': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN',
  'undefined': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objecs/undefined',
  'null': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null',
  // Fundamental objects
  'Object': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
  'object': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
  'Function': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
  'function': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
  'Boolean': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean',
  'boolean': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean',
  'Symbol': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol',
  'Error': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
  'EvalError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/EvalError',
  'InternalError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/InternalError',
  'RangeError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError',
  'ReferenceError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError',
  'SyntaxError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError',
  'TypeError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError',
  'URIError': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/URIError',
  // Numbers and dates
  'Number': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number',
  'number': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number',
  'Date': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date',
  // Text processing
  'String': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String',
  'string': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String',
  'RegExp': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
  // Indexed collections
  'Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
  'Int8Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int8Array',
  'Uint8Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array',
  'Uint8ClampedArray': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray',
  'Int16Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int16Array',
  'Uint16Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array',
  'Int32Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int32Array',
  'Uint32Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array',
  'Float32Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array',
  'Float64Array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float64Array',
  // Keyed collections
  'Map': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
  'Set': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
  'WeakMap': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap',
  'WeakSet': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet',
  // Structured data
  'ArrayBuffer': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer',
  'DataView': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView',
  'JSON': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON',
  // Control abstraction objects
  'Promise': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
  'Generator': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator',
  'GeneratorFunction': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction',
  // Reflection
  'Reflect': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect',
  'Proxy': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy',
  // Misc
  'Class': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes',
  'class': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes',
  /**
   * Node.js
   * https://nodejs.org/api/
   */
  'events~EventEmitter': 'https://nodejs.org/api/events.html#events_class_eventemitter',
  'http~ClientRequest': 'https://nodejs.org/api/http.html#http_class_http_clientrequest',
  'http~ServerResponse': 'https://nodejs.org/api/http.html#http_class_http_serverresponse',
  'net~Server': 'https://nodejs.org/api/net.html#net_class_net_server',
  /**
   * Express.js
   * https://expressjs.com/en/4x/api.html
   */
  'express~App': 'https://expressjs.com/en/4x/api.html#app',
  'express~Router': 'https://expressjs.com/en/4x/api.html#router',
  /**
   * MongoDB
   * https://mongodb.github.io/node-mongodb-native/3.3/api/index.html
   */
  'mongodb~Collection': 'https://mongodb.github.io/node-mongodb-native/3.4/api/Db.html#collection',
  'mongodb~MongoClient': 'https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html',
  'mongodb~ObjectID': 'https://mongodb.github.io/node-mongodb-native/3.4/api/ObjectID.html',
  /**
   * Mongoose.js
   * https://mongoosejs.com/docs/api.html
   */
  'mongoose~Connection': 'https://mongoosejs.com/docs/api.html#Connection',
  'mongoose~Schema': 'https://mongoosejs.com/docs/api.html#Schema',
  'mongoose~Schematype': 'https://mongoosejs.com/docs/api.html#Schematype',
  /**
   * Nodemailer
   * https://nodemailer.com/about/
   */
  'Nodemailer~Transport': 'https://nodemailer.com/smtp/',
  /**
   * Polyglot.js
   * https://github.com/airbnb/polyglot.js
   */
  'polyglot~Polyglot': 'https://github.com/airbnb/polyglot.js#usage'
};

module.exports = new Plugin();
