import SwaggerUI from 'swagger-ui'
// import 'swagger-ui/dist/swagger-ui.css';

addEventListener("load", async () => {
  SwaggerUI({ 
    url: '/api.json',
    dom_id: '#swagger'
  });
});

