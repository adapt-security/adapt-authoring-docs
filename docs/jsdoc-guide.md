# JSDoc style guide

This guide covers the JSDoc conventions used throughout the Adapt authoring tool. Following these conventions ensures your code integrates properly with the auto-generated documentation. For comprehensive JSDoc documentation, see the [official JSDoc website](https://jsdoc.app/).

The documentation generator scans all `.js` files in `lib/` and the module's `index.js`.

## Basic structure

All exported classes, functions, and significant variables should have JSDoc comments. Comments use the `/** ... */` format:

```javascript
/**
 * Brief description of what this does
 * @memberof namespaceName
 */
class MyClass {
  // ...
}
```

## Common tags reference

The below table lists the most common tags used in JSDoc comments:

| Tag | Purpose | Example |
| --- | ------- | ------- |
| `@memberof` | Assign to namespace | `@memberof core` |
| `@extends` | Document inheritance | `@extends {AbstractModule}` |
| `@type` | Property type | `@type {String}` |
| `@param` | Function parameter | `@param {Object} data The input data` |
| `@return` | Return value | `@return {Promise} Resolves with result` |
| `@override` | Overridden method | `@override` |
| `@typedef` | Custom type definition | `@typedef {Object} MyOptions` |
| `@property` | Property of typedef | `@property {String} name The name` |
| `@ignore` | Exclude from docs | `@ignore` |
| `@example` | Code example | `@example myFunction()` |
| `@see` | Cross-reference | `@see {ApiRoute}` |

## Style notes

Following [Standard.js](https://standardjs.com/) conventions:

- No semicolons in examples
- No trailing commas
- Use single quotes in code examples
- Two-space indentation

## Namespaces

Use `@memberof` to group related classes into namespaces. The namespace should use the name of your module (e.g. `core`, `api`).

```javascript
/**
 * Core functionality
 * @namespace core
 */

/**
 * The main application class
 * @memberof core
 * @extends {AbstractModule}
 */
class App extends AbstractModule {
  // ...
}
```

## Classes

Document classes with a brief description, namespace membership, and inheritance:

```javascript
/**
 * Abstract module for creating APIs
 * @memberof api
 * @extends {AbstractModule}
 */
class AbstractApiModule extends AbstractModule {
  // ...
}
```

## Properties

Document instance properties with `@type`. 

**Important:** Any declared instance variables must be initialised to be picked up by the documentation generator. Use `undefined` if no initial value is needed.

```javascript
constructor () {
  /**
   * Reference to the main app instance
   * @type {App}
   */
  this.app = app

  /**
   * Time taken in milliseconds for module to initialise
   * @type {Number}
   */
  this.initTime = undefined  // initialise even if no value yet
}
```

## Methods

Document methods with a description, parameters, and return values:

```javascript
/**
 * Enables waiting for other modules to load
 * @param {...String} modNames Names of modules to wait for
 * @return {Promise} Resolves when specified module has been loaded
 */
async waitForModule (...modNames) {
  // ...
}
```

For methods with complex parameters:

```javascript
/**
 * Inserts a new document into the DB
 * @param {Object} data Data to be inserted into the DB
 * @param {InsertOptions} options Function options
 * @param {external:MongoDBInsertOneOptions} mongoOptions Options passed to MongoDB
 * @return {Promise} Resolves with DB data
 */
async insert (data, options = {}, mongoOptions = {}) {
  // ...
}
```

## Overridden methods

Use `@override` for methods that override a parent class:

```javascript
/** @override */
async init () {
  await super.init()
  // ...
}
```

## Type definitions

For complex types used across multiple files, it is recommended that you create a dedicated `typedefs.js` file. Use `@typedef` for object shapes and `@property` for each field.

```javascript
/**
 * This file exists to define types for documentation purposes.
 */

/**
 * Options for insert operations
 * @memberof api
 * @typedef {Object} InsertOptions
 * @property {String} schemaName Name of the schema to validate against
 * @property {String} collectionName DB collection to insert document into
 * @property {Boolean} validate Whether incoming data should be validated
 * @property {Boolean} invokePostHook Whether to invoke the post-action hook
 */
```

## Excluding from documentation

Use `@ignore` to exclude internal properties or methods from the generated documentation:

```javascript
/** @ignore */
this._isReady = false

/** @ignore */
_internalMethod () {
  // ...
}
```

## Examples in documentation

Use `@example` to include code samples:

```javascript
/**
 * Uses default configuration for API routes
 * @example
 * POST /
 * GET /:_id?
 * PUT/DELETE /:_id
 */
useDefaultRouteConfig () {
  // ...
}
```
