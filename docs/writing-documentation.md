# Writing documentation
The Adapt authoring tool makes use of automatically generated documentation (powered by [ESDoc](https://esdoc.org/)).

**Source code reference** *mandatory* <br>
Requires annotated code (see below), but otherwise completely automated.

**Developer manual** *optional*<br>
Requires handwritten markdown. Provides extra advice on using your code in practical scenarios.

## Documenting code
The source code reference is completely automated, and shouldn't need much input from you as a developer (provided your code has been correctly annotated).

If you're not familiar with the JSDoc notation, you can find a list of accepted tags as well as examples of usage in the [ESDoc docs](https://esdoc.org/manual/tags.html) (you can also of course check the source code for any of the [core-supported Adapt authoring modules](coreplugins.html) which are fully documented).

### Useful tips
Below are some useful tips/gotchas for any budding documentation writers.

#### Instance variables must be initialised
Any declared instance variables must be initialised in order to be picked up by the documentation generator, even if they don't need a value (in which case `this.var = undefined` is fine).

## Writing developer guides
Developer guides go a step further than the source code reference, and provide more user-friendly "how-to" guides on how to actually *use* your code in a practical scenario.

Whether or not you include these in your modules is completely up to you, but it will greatly help the community if you do!

What to include in developer guides:
- Any required configuration options
- Common usage examples
- Any known issues/workarounds

> If you have need to generate a dynamic documentation file, check out our guide on [writing custom doc plugins](custom-documentation-plugins).

## Configuration
In addition to writing the manual files, you'll also need to add some configuration to the `adapt-authoring.json` file for your module to ensure that your files are included when the documentation is built.

All documentation-related options are contained in a `documentation` object at the root level:
```json
{
  "documentation": {
    "enable": true,
    "manualPlugins": [],
    "manualSections": {}
  }
}
```

The below table gives a brief explanation of each option:

| Attribute | Type | Default | Description |
| --------- | ---- | :-----: | ----------- |
| `enable` | Boolean | `true` | Whether documentation should be generated for this module. |
| `manualPlugins` | Array | `[]` | A list of paths to any custom manual plugins. See [this page](custom-documentation-plugins) for more info. |
| `manualSections` | Object | `{}` | A key/value store mapping file names to a section. The key must be the filename only, and not a path. The section ID must match one of those defined in the config (see the [configuration reference](configuration?id=adapt-authoring-docs) for the defaults, or set your own in your config file). |

> You can also store manual files in the root repository of the application; just make sure to add your doc files to a `/docs` directory.
