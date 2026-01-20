# Writing documentation

The Adapt authoring tool uses a three-tier documentation system:

1. **Source code reference** — Auto-generated API documentation from JSDoc comments
2. **Developer manual** — Handwritten markdown guides for practical usage
3. **REST API reference** — Auto-generated OpenAPI/Swagger documentation from route definitions

All documentation is built using the `at-docgen` CLI provided by this module.

## Source code reference

JSDoc comments in your code are automatically parsed and rendered as API documentation. This requires no extra configuration beyond enabling documentation for your module, which can done by adding the following to your module's `adapt-authoring.json`:

```json
{
  "documentation": {
    "enable": true
  }
}
```

For guidance on writing effective JSDoc comments, see the [JSDoc style guide](jsdoc-guide.md).

## Developer manual

Markdown files in your module's `docs/` folder are included in the developer manual. These provide practical guides on using your module.

To assign pages to specific sections in the manual, use the `manualPages` option:

```json
{
  "documentation": {
    "enable": true,
    "manualPages": {
      "getting-started.md": "basics",
      "advanced-usage.md": "advanced"
    }
  }
}
```

Available sections include `basics`, `advanced`, `reference`, and `contributing`. You can also define custom sections if needed. Files not listed in `manualPages` are assigned to the default section.

## REST API reference

You can also add documentation for the REST API endpoints defined in your module.

If your module extends `AbstractApiModule`, REST API documentation is generated automatically from your route definitions. For custom routes or additional metadata, see the [API documentation guide](api-documentation.md).

## Custom dynamic documentation

For documentation that needs to be generated programmatically (e.g. listing all registered schemas), you can write custom documentation plugins. See [writing custom documentation plugins](custom-documentation-plugins.md) for details.

## Further reading

- [JSDoc style guide](jsdoc-guide.md) — Conventions for documenting your code
- [API documentation guide](api-documentation.md) — Documenting REST API endpoints
- [Custom documentation plugins](custom-documentation-plugins.md) — Generating dynamic documentation
