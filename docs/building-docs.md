# Building the docs
If you want to build your own local copy of the documentation, you'll need to run the bin script bundled with the documentation module.

> If you ran the automated intaller, chances are you didn't install the optional developer dependencies (and therefore don't have the documentation module). You can fix this by running:
`npm i --only=dev`

Run the documentation generator using:

```bash
npx at-docgen
```

Once the documentation has been built, it'll be stored in the temp directory. Where this is will vary depending on your config file, but you can find the default [location here](configuration?id=adapt-authoring-docs).

To correctly view the docs, you'll need to run a local web server. You can do this using another automated bin script bundled with the documentation module:

```bash
npx at-docserve
```

See the [bin script docs](binscripts) for full usage details.