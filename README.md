# adapt-authoring-docs

Tooling that auto-generates the Adapt authoring tool's documentation. It assembles each module's manual pages (the `docs/*.md` guides declared in `adapt-authoring.json`) together with a jsdoc-derived API reference into a single documentation site.

This is a build-time / CLI tool, not a runtime application module.

## Documentation

- [Building docs](docs/building-docs.md) — generating the documentation site
- [Writing documentation](docs/writing-documentation.md) — authoring manual pages
- [jsdoc guide](docs/jsdoc-guide.md) · [REST API guide](docs/rest-api-guide.md) — reference generation
- [Custom documentation plugins](docs/custom-documentation-plugins.md) — extending the build
