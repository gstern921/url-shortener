const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const monk = require("monk");
const yup = require("yup");
const cors = require("cors");
const { nanoid } = require("nanoid");
const { json } = require("express");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();

const appName = "cdg.sh";
const appSlogan = "Short URLs for your code garden";

const HTTP_OK = 200;
const HTTP_ERROR = 500;
const STATUS_SUCCESS = "success";
const STATUS_FAIL = "fail";
const STATUS_ERROR = "error";
const defaultSlugLength = 5;
const { MONGO_URI, PORT = 5000, NODE_ENV = "development" } = process.env;

const IS_DEVELOPMENT = NODE_ENV === "development";

const db = monk(MONGO_URI);

const urls = db.get("urls");
urls.createIndex({ slug: 1 }, { unique: true });

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

const schema = yup.object().shape({
  url: yup.string().trim().url().required(),
  slug: yup
    .string()
    .trim()
    .lowercase()
    .default(() => nanoid(defaultSlugLength).toLowerCase())
    .matches(/^[\w\-]+$/i),
  createdAt: yup.date().default(() => new Date()),
});

const app = express();

app.use(morgan(IS_DEVELOPMENT ? "dev" : "tiny"));
if (!IS_DEVELOPMENT) {
  app.use(helmet());
}
app.use(cors());
app.use(express.json());
app.use(express.static("./public"));
app.use(mongoSanitize());

app.get("/", (req, res) => {
  res.status(HTTP_OK).json({
    status: STATUS_SUCCESS,
    message: `${appName} - ${appSlogan}`,
  });
});

// app.get("/url/:id", (req, res) => {
//   // TODO: retrieve information about URL
// });

app.post("/url", async (req, res, next) => {
  const url = req.body.url || undefined;
  const slug = req.body.slug || undefined;

  try {
    let newURL = await schema.validate({ url, slug });

    const created = await urls.insert(newURL);

    return res.status(HTTP_OK).json({ status: STATUS_SUCCESS, url: created });
  } catch (err) {
    return next(err);
  }
});

app.get("/:id", async (req, res, next) => {
  const slug = req.params.id;
  try {
    const url = await urls.findOne({ slug });
    if (url && url.url) {
      return res.redirect(301, url.url);
    }
    return next(new Error(`${slug} not found`));
  } catch (err) {
    return next(err);
  }
});
app.use((err, req, res, next) => {
  if (err.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
    err.message = `slug in use. 🐌`;
  }
  const status = err.status || HTTP_ERROR;
  const jsonResponse = { status: STATUS_ERROR, message: err.message };
  jsonResponse.stack = IS_DEVELOPMENT ? err.stack : `🥞`;
  return res.status(status).json(jsonResponse);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
