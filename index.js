const express = require("express");
require("express-async-errors");
const cors = require("cors");
const cookieSession = require("cookie-session");
const createTables = require("./queries/create-tables");
const keys = require("./keys");
const cleanup = require("./queries/cleanup");

const app = express();

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://pg-sql.com", "https://notes.pg-sql.com"]
    : ["http://localhost:3000"];

app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : 0);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified origin";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin:
//       process.env.NODE_ENV === "production"
//         ? ["https://pg-sql.com", "https://notes.pg-sql.com"]
//         : ["http://localhost:3000"],
//     credentials: true,
//   })
// );
app.use(express.json());
app.use(
  cookieSession({
    secure: process.env.NODE_ENV === "production",
    keys: [keys.cookieKey],
    sameSite: "Lax",
    httpOnly: true,
    domain: process.env.NODE_ENV === "production" ? "pg-sql.com" : undefined,
  })
);

app.use((req, res, next) => {
  console.log("Session:", req.session);
  if (!req.session) {
    return next(new Error("Session is not set up properly"));
  }
  next();
});

app.post("/provision", require("./provision"));
app.post("/query", require("./query"));
app.post("/reset", require("./reset"));

app.use((err, req, res, next) => {
  if (err) {
    res.status(500);
    res.json({ error: err.message });
  }

  next(err);
});

(async () => {
  await createTables();

  setInterval(cleanup, 1000 * 60 * 60);

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log("Listening");
  });
})();
