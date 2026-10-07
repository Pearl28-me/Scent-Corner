const path = require("path");
const express = require("express");
const helmet = require("helmet");

const { config } = require("./config");
const {
  notFound,
  errorHandler
} = require("./middleware/errors");


/* =========================================================
   CREATE EXPRESS APP
   ========================================================= */

const app = express();


/* =========================================================
   BASIC SERVER SETTINGS
   ========================================================= */

app.set("trust proxy", 1);


/* =========================================================
   SECURITY
   ========================================================= */

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,

      directives: {

        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],

        fontSrc: [
          "https://fonts.gstatic.com"
        ],

        imgSrc: [
          "'self'",
          "data:"
        ],

        connectSrc: [
          "'self'"
        ],

        frameAncestors: [
          "'none'"
        ]

      }
    }
  })
);


/* =========================================================
   READ JSON REQUESTS
   ========================================================= */

/*
  Limits JSON requests to 50KB.

  This helps prevent extremely large requests
  from being sent to the server.
*/

app.use(
  express.json({
    limit: "50kb"
  })
);


/* =========================================================
   HEALTH CHECK
   ========================================================= */

/*
  Used to check whether the backend is running.

  Visiting:

      /api/health

  should return:

      { "ok": true }
*/

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok: true
    });

  }
);


/* =========================================================
   SHOP CONFIGURATION
   ========================================================= */

/*
  The storefront can request:

      GET /api/config

  instead of having the shop information
  hard-coded inside app.js.
*/

app.get(
  "/api/config",
  (req, res) => {

    res.json({

      name: config.shopName,

      whatsapp: config.whatsapp,

      currency: config.currency

    });

  }
);


/* =========================================================
   API ROUTES
   ========================================================= */


/* Admin authentication */

app.use(
  "/api/auth",
  require("./routes/auth")
);


/* Public products */

app.use(
  "/api/products",
  require("./routes/products").publicRouter
);


/* Customer orders */

app.use(
  "/api/orders",
  require("./routes/orders").publicRouter
);


/* Admin dashboard */

app.use(
  "/api/admin",
  require("./routes/admin")
);


/* =========================================================
   API 404 HANDLER
   ========================================================= */

/*
  If someone requests an API route
  that doesn't exist, return:

      404 - Not found
*/

app.use(
  "/api",
  notFound
);


/* =========================================================
   PRODUCT IMAGE UPLOADS
   ========================================================= */

/*
  Uploaded perfume images are served from:

      /uploads/filename.jpg
*/

app.use(
  "/uploads",
  express.static(
    config.uploadDir,
    {
      maxAge: "7d"
    }
  )
);


/* =========================================================
   FRONTEND / PUBLIC WEBSITE
   ========================================================= */

/*
  Serves files from:

      /public

  For example:

      public/index.html
      public/css/style.css
      public/js/app.js
*/

// Customer website
app.use(express.static(path.join(__dirname, "..", "public")));

// Admin dashboard
app.use(express.static(path.join(__dirname, "..", "admin")));


/* =========================================================
   GLOBAL ERROR HANDLER
   ========================================================= */

/*
  This MUST come after the routes.
*/

app.use(errorHandler);


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = app;