const { ZodError } = require("zod");


/* =========================================================
   HTTP ERROR
   ========================================================= */

class HttpError extends Error {

  constructor(status, message) {

    super(message);

    this.status = status;

    this.name = "HttpError";

  }

}


/* =========================================================
   VALIDATE REQUEST DATA
   ========================================================= */

/*
  Validate data using a Zod schema.

  If the data is valid:
      return the cleaned/validated data.

  If the data is invalid:
      throw a 400 error.
*/

function parse(schema, data) {

  const result = schema.safeParse(data);


  if (result.success) {

    return result.data;

  }


  const issue =
    result.error.issues[0];


  const field =
    issue.path.length
      ? `${issue.path.join(".")}: `
      : "";


  throw new HttpError(
    400,
    field + issue.message
  );

}


/* =========================================================
   404 - ROUTE NOT FOUND
   ========================================================= */

function notFound(req, res) {

  return res.status(404).json({
    error: "Not found."
  });

}


/* =========================================================
   GLOBAL ERROR HANDLER
   ========================================================= */

/*
  Express recognizes this as an error handler
  because it has FOUR parameters:

      err
      req
      res
      next
*/

function errorHandler(err, req, res, next) {

  /* -----------------------------------------
     Our custom HTTP errors
     ----------------------------------------- */

  if (err instanceof HttpError) {

    return res.status(err.status).json({
      error: err.message
    });

  }


  /* -----------------------------------------
     Zod validation errors
     ----------------------------------------- */

  if (err instanceof ZodError) {

    return res.status(400).json({
      error: err.issues[0]?.message || "Invalid data."
    });

  }


  /* -----------------------------------------
     Invalid JSON
     ----------------------------------------- */

  if (err.type === "entity.parse.failed") {

    return res.status(400).json({
      error: "Invalid JSON."
    });

  }


  /* -----------------------------------------
     Image/file too large
     ----------------------------------------- */

  if (err.code === "LIMIT_FILE_SIZE") {

    return res.status(400).json({
      error: "Image must be 2MB or smaller."
    });

  }


  /* -----------------------------------------
     Unknown server error
     ----------------------------------------- */

  console.error(err);

  return res.status(500).json({
    error:
      "Something went wrong on our side. Try again."
  });

}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {
  HttpError,
  parse,
  notFound,
  errorHandler
};