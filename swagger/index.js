import SwaggerUI from 'swagger-ui'
// import 'swagger-ui/dist/swagger-ui.css';

SwaggerUI({ 
  spec: {
    openapi: "3.1.0",
    info: {
      // title: app.name,
      // version: app.version
      title: "adapt-authoring",
      version: "1.0.0"
    },
    paths: {}
  },
  dom_id: '#swagger'
});
