/**
 * Removes any optional chaining use from the incoming doc
 * @see https://github.com/esdoc/esdoc/issues/532#issuecomment-670843906
 */
class Plugin {
  onHandleCode(event) {
    event.data.code = event.data.code.replace(/\w+\?\.\b/g, substr => {
      return substr.replace(/\?/g, '');
    });
  }
}

module.exports = new Plugin();
