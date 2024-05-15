const express = require('express')
const router = express.Router()
const fs = require('fs')
const routesPath = `${__dirname}/`
const { removeExtensionFromFile } = require('../middleware/utils')
// const swaggerUi = require('swagger-ui-express');
// const swaggerDocument = require('../../swagger-output.json');
/*
 * Load routes statically and/or dynamically
*/
const app = express()
console.log("routesPath===============",routesPath)
// Loop routes path and loads every file as a route except this file and Auth route
fs.readdirSync(routesPath).filter(file => {
  // Take filename and remove last part (extension)
  const routeFile = removeExtensionFromFile(file)
  // Prevents loading of this file and auth file
  return routeFile !== 'index'  ? router.use(`/${routeFile}`, require(`./${routeFile}`)) : ''
})

/*
 * Setup routes for index
 */
router.get('/', (req, res) => {
  res.render('index')
})

/*
 * Handle 404 error
 */
router.use('*', (req, res) => {
  res.status(404).json({
    errors: {
      msg: 'URL_NOT_FOUND'
    }
  })
})

// router.get('/', swaggerUi.setup(swaggerDocument));
// app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
module.exports = router
