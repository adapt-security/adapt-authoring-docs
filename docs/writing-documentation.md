# Writing documentation
The Adapt authoring tool makes use of automatically generated documentation (powered by [ESDoc](https://esdoc.org/)).

**Source code reference** *mandatory* <br>
Requires annotated code (see below), but otherwise completely automated.

**Developer manual** *optional*<br>
Requires handwritten markdown. Provides extra advice on using your code in practical scenarios.

## Documenting code
The source code reference is completely automated, and shouldn't need much input from you as a developer (provided your code has been correctly annotated).

If you're not familiar with the JSDoc notation, you can find a list of accepted tags as well as examples of usage in the [ESDoc docs](https://esdoc.org/manual/tags.html) (you can also of course check the source code for any of the [core-supported Adapt authoring modules]() which are fully documented).

## Writing developer guides
Developer guides go a step further than the source code reference, and provide more user-friendly how-to guides on how to actually *use* your code in a practical scenario.

Whether or not you include these in your modules is completely up to you, but the community will forever thank you if you do!

What to include in developer guides:
- Any required configuration options

### Configuration
In addition to writing the manual files, you'll also need to add some configuration to the `package.json` to ensure that your files are included when the documentation is built.
