# Writing documentation
The Adapt authoring tool makes use of automatically generated documentation (powered by [ESDoc](https://esdoc.org/)).

**Source code reference** *mandatory* <br>
Requires annotated code (see below), but otherwise completely automated.

**Developer manual** *optional*<br>
Requires handwritten markdown. Provides extra advice on using your code in practical scenarios.

## Documenting code
The source code reference is completely automated, and shouldn't need much input from you as a developer (provided your code has been correctly annotated).

If you're not familiar with the JSDoc notation, you can find a list of accepted tags as well as examples of usage in the [ESDoc docs](https://esdoc.org/manual/tags.html) (you can also of course check the source code for any of the [core-supported Adapt authoring modules](coreplugins.html) which are fully documented).

## Writing developer guides
Developer guides go a step further than the source code reference, and provide more user-friendly "how-to" guides on how to actually *use* your code in a practical scenario.

Whether or not you include these in your modules is completely up to you, but it will greatly help the community if you do!

What to include in developer guides:
- Any required configuration options
- Common usage examples
- Any known issues/workarounds

## Configuration
In addition to writing the manual files, you'll also need to add some configuration to the `package.json` of your module to ensure that your files are included when the documentation is built.

All documentation-related options are contained in a `documentation` object under the main `adapt_authoring`:
```json
"adapt_authoring": {
  "documentation": {
    "enable": true,
    "includes": {
      "docs": "docs/*",
      "source": "lib/*"
    }
  }
}
```

The below table gives a brief explanation of each option:

| Attribute | Type | Default | Description |
| --------- | ---- | :-----: | ----------- |
| `enable` | Boolean | `false` | Whether documentation should be generated for this module. |
| `includes.docs` | String | N/A | [Glob](https://en.wikipedia.org/wiki/Glob_(programming) to match the docs files in your module. <br>_If you don't want to include any manual pages, leave this setting out._ |
| `includes.source` | String | `*.js` | Glob to match the code source files in your module. |


_**Did you know**: You can also store manual files in the root repository of the application. Just make sure to add the config to your root `package.json`._
