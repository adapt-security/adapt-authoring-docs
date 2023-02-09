import SwaggerUI from 'swagger-ui'
addEventListener("load", () => SwaggerUI({ url: 'api.json', dom_id: '#swagger' }));