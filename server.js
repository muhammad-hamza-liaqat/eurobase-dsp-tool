require("dotenv-safe").config();
const express = require("express");
const bodyParser = require("body-parser");

const morgan = require("morgan");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const passport = require("passport");
const app = express();
const i18n = require("i18n");
const path = require("path");
var fileUpload = require("express-fileupload");
const initMongo = require("./config/mongo");
// const websocket = require('./websocket')
var https = require("https");
var http = require("http");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
var fs = require("fs");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-a.json");
// const {updateExpiredAccounts} = require("./app/cronJob");
// var options = {
//   key: fs.readFileSync(
//     '/etc/letsencrypt/live/betazone1.promaticstechnologies.com/privkey.pem',
//     'utf8'
//   ),
//   cert: fs.readFileSync(
//     '/etc/letsencrypt/live/betazone1.promaticstechnologies.com/fullchain.pem',
//     'utf8'
//   )
// }

// Setup express server port from ENV, default: 3000
app.set("port", process.env.PORT || 9000);

// Enable only in development HTTP request logger middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  // var options = {
  //   key: fs.readFileSync(
  //     "/etc/letsencrypt/live/betazone1.promaticstechnologies.com/privkey.pem",
  //     "utf8"
  //   ),
  //   cert: fs.readFileSync(
  //     "/etc/letsencrypt/live/betazone1.promaticstechnologies.com/fullchain.pem",
  //     "utf8"
  //   ),
  // };
  console.log("=======chek server");
  // var httpsServer = https.createServer(options, app);
  var httpsServer = https.createServer( app);
  httpsServer.listen(app.get("port"), function () {
    console.log("socket running on port no : " + app.get("port"));
  });
  console.log("=======check w2 serser`  ");
} else {
  var httpsServer = http.createServer(app).listen(8000);
  // httpsServer.listen(app.get('port'), function () {
  //   console.log('socket running on port no : ' + app.get('port'))
  // })
  console.log("=======check Local Server` ");
  app.listen(5000, function () {
    console.log("listening on port no : " + 5000);
  });
}

// Redis cache enabled by env variable
if (process.env.USE_REDIS === "true") {
  const getExpeditiousCache = require("express-expeditious");
  const cache = getExpeditiousCache({
    namespace: "expresscache",
    defaultTtl: "1 minute",
    engine: require("expeditious-engine-redis")({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    }),
  });
  app.use(cache);
}

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    authAction: {
      JWT: {
        name: "JWT",
        schema: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "",
        },
        value: "Bearer <JWT token here>",
      },
    },
  },
};
app.use(
  "/user",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, swaggerUiOptions)
);
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next(); // Do nothing with the body because I need it in a raw state.
  } else {
    express.json()(req, res, next); // ONLY do express.json() if the received request is NOT a WebHook from Stripe.
  }
});
app.use(
  bodyParser.json({
    verify: function (req, res, buf) {
      req.rawBody = buf;
    },
  })
);
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (request, response) => {
    const sig = request.headers["stripe-signature"];
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        process.env.endpointSecret
      );
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    console.log(event)
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutSessionCompleted = event.data.object;
        // Then define and call a function to handle the event checkout.session.completed
        break;
      case "payment_intent.payment_failed":
        const paymentIntentPaymentFailed = event.data.object;
        // Then define and call a function to handle the event payment_intent.payment_failed
        break;
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object;
        // Then define and call a function to handle the event payment_intent.succeeded
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);
app.use(
  bodyParser.json({
    limit: "20mb",
  })
);
// for parsing application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    limit: "20mb",
    extended: true,
  })
);

// i18n
i18n.configure({
  locales: ["en", "es"],
  directory: `${__dirname}/locales`,
  defaultLocale: "en",
  objectNotation: true,
});
app.use(i18n.init);

// Init all other stuff

// place this middleware before declaring any routes
app.use((req, res, next) => {
  // This reads the accept-language header
  // and returns the language if found or false if not
  const lang = req.acceptsLanguages("en", "ar");
  if (lang) {
    // if found, attach it as property to the request
    req.lang = lang;
  } else {
    // else set the default language
    req.lang = "en";
  }
  next();
});
// app.use(bodyParser.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use(cors());
app.use(passport.initialize());
app.use(compression());
app.use(helmet());
app.use(fileUpload());
// app.use(express.static('public'))
app.engine("ejs", require("ejs").renderFile);
// app.set('view engine', 'html')
app.set("view engine", "ejs");
app.use(require("./app/routes/index"));
app.use(require("./app/routes/admin"));
app.use(require("./app/routes/auth"));
app.use(require("./app/routes/users"));

app.set('uploads', path.join(__dirname,"..", "..",  "public", "uploads"));

//app.listen(app.get('port'))
// console.log(app.get('port'))
http.createServer(app).listen(9000)

// websocket()

// Init MongoDB
initMongo();

module.exports = app; // for testing
