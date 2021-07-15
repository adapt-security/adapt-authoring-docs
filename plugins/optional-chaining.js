/**
 * Removes any optional chaining use from the incoming doc
 * @see https://github.com/esdoc/esdoc/issues/532#issuecomment-670843906
 */
 class Plugin {
  onHandleCode(event) {
    event.data.code = event.data.code.replace(/\w+\?\./g, s => s.replace(/\?/g, ''));
  }
}

module.exports = new Plugin();
