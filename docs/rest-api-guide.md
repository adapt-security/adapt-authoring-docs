# API documentation guide

The Adapt authoring tool automatically generates REST API documentation using the OpenAPI 3.0 specification, rendered with Swagger UI.

This guide covers how to ensure your API routes are properly documented.

## Automatic documentation

If your module extends `AbstractApiModule` and uses `useDefaultRouteConfig()`, documentation is generated automatically for standard CRUD routes. This generates documentation for:

| Method | Route | Description |
| ------ | ----- | ----------- |
| POST | `/api/myresource` | Insert a new document |
| GET | `/api/myresource` | Retrieve all documents |
| GET | `/api/myresource/:_id` | Retrieve a single document |
| PUT | `/api/myresource/:_id` | Replace a document |
| PATCH | `/api/myresource/:_id` | Update a document |
| DELETE | `/api/myresource/:_id` | Delete a document |
| POST | `/api/myresource/query` | Query documents |
| GET | `/api/myresource/schema` | Retrieve the schema |

## Custom route metadata

For custom routes, provide metadata using the `meta` property on your route definition. The metadata follows the [OpenAPI 3.0 Operation Object](https://spec.openapis.org/oas/v3.0.3#operation-object) specification.

### Basic example

```javascript
async setValues () {
   this.routes.push({
    // ... route config
    meta: {
      post: {
        summary: 'Publish a resource'
      }
    }
  })
}
```

### Defining API metadata separately

For more complex APIs, define metadata in a separate file to keep your module code clean:

```javascript
// lib/apidefs.js
export default {
  publish: {
    post: {
      summary: 'Publish a resource',
      parameters: [
        { name: '_id', in: 'path', description: 'Resource _id', required: true }
      ],
      responses: {
        200: {
          description: 'The published resource',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/myresource' }
            }
          }
        }
      }
    }
  }
}
```

Then import and use it in your module:

```javascript
// lib/MyApiModule.js
import { AbstractApiModule } from 'adapt-authoring-api'
import apidefs from './apidefs.js'

class MyApiModule extends AbstractApiModule {
  async setValues () {
    this.routes.push({
      // ... route config
      meta: apidefs.publish
    })
  }
}
```

## Metadata structure

Each HTTP method on a route can have the following metadata:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `summary` | String | Brief description shown in the route list |
| `description` | String | Detailed description shown when expanded |
| `parameters` | Array | Path, query, or header parameters |
| `requestBody` | Object | Request body schema |
| `responses` | Object | Response schemas keyed by status code |

### Parameters

Define parameters for path variables, query strings, or headers:

```javascript
parameters: [
  {
    name: '_id',
    // where the parameter is set: in the path (URL), as a query parameter,
    // or as an HTTP header
    in: 'path', 
    description: 'The resource ID',
    required: true
  },
  {
    name: 'includeRelated',
    in: 'query',
    description: 'Whether to include related resources'
  }
]
```

### Request body

Define the expected request body:

```javascript
requestBody: {
  description: 'The resource data',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/myresource' }
    }
  }
}
```

For inline schemas:

```javascript
requestBody: {
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          force: { type: 'boolean', default: false }
        }
      }
    }
  }
}
```

### Responses

Define possible responses:

```javascript
responses: {
  200: {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/myresource' }
      }
    }
  },
  404: {
    description: 'Resource not found'
  }
}
```

For array responses:

```javascript
responses: {
  200: {
    description: 'List of resources',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: '#/components/schemas/myresource' }
        }
      }
    }
  }
}
```

## Schema references

Use `$ref` to reference schemas registered with the `jsonschema` module:

```javascript
{ $ref: '#/components/schemas/myresource' }
```

The schema name should match what you registered via `jsonschema.registerSchema()` or defined in a `.schema.json` file.

## Complete example

Here's a complete example showing custom routes with full metadata:

```javascript
// lib/apidefs.js
export default {
  install: {
    post: {
      summary: 'Install a new plugin',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                force: { type: 'boolean', default: false }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'The installed plugin',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/contentplugin' }
            }
          }
        }
      }
    }
  },
  uses: {
    get: {
      summary: 'Get courses using this plugin',
      parameters: [
        { name: '_id', in: 'path', description: 'Plugin _id', required: true }
      ],
      responses: {
        200: {
          description: 'List of courses',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/course' }
              }
            }
          }
        }
      }
    }
  }
}
```

```javascript
// lib/MyPluginModule.js
import { AbstractApiModule } from 'adapt-authoring-api'
import apidefs from './apidefs.js'

class MyPluginModule extends AbstractApiModule {
  async setValues () {
    this.root = 'plugins'
    this.collectionName = 'plugins'
    this.schemaName = 'plugin'
    this.useDefaultRouteConfig()

    this.routes.push(
      {
        route: '/install',
        handlers: { post: this.installHandler.bind(this) },
        permissions: { post: ['install:plugin'] },
        validate: false,
        meta: apidefs.install
      },
      {
        route: '/:_id/uses',
        handlers: { get: this.usesHandler.bind(this) },
        permissions: { get: ['read:plugin'] },
        meta: apidefs.uses
      }
    )
  }
}
```
