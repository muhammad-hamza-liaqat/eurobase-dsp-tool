const options = {  
  autoQuery:        true,    
  autoBody:         true,    
  writeOutputFile:  true,    
}

const swaggerAutogen = require('swagger-autogen')(options);

const doc = {
  info: {
    title: 'My API',
    description: 'Description'
  },
  host: 'betazone1.promaticstechnologies.com:5011/users',
  schemes:['https'],
  components: {
    securitySchemes:{
        bearerAuth: {
            type: 'https',
            scheme: 'bearer'
        }
    }
}
};
// const routesall = require("./app/routes")
const outputFile = './swagger-a.json';
const routes = ["./app/routes/users.js"];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

// swaggerAutogen(outputFile, routes, doc);

swaggerAutogen(outputFile, routes, doc).then(() => {
    require('./server.js'); // Your project's root file
  });