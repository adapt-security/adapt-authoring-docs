# Writing documentation
The Adapt authoring tool makes use of automatically generated documentation (powered by [ESDoc](https://esdoc.org/)).

There are two different areas to the documentation which you should be concerned with when writing your code:

**Source code reference** *mandatory* requires annotated code, completely automated.

Developer manual: **optional** developer guides which offer advice on using your code in practical scenarios, requires handwritten markdown.  

## Documenting code
The source code reference is completely automated, and shouldn't need much input from you as a developer (provided your code has been ).

Tags https://esdoc.org/manual/tags.html

## Writing developer guides
Developer guides go a step further than the source code reference, and provide more user-friendly how-to guides on how to actually *use* your code in a practical scenario.

Whether or not you include these in your modules is completely up to you, but the community will forever thank you if you do!

What to include in developer guides:
- Any required configuration options

### Configuration
In addition to writing the manual files, you'll also need to add some configuration to the `package.json` to ensure that your files are included when the documentation is built.
