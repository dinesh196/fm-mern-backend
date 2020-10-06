const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const bodyparser = require("body-parser");
const path = require("path");
const Pusher = require("pusher");
const mongoPosts = require("./mongoPosts");
// import mongoPosts from "./mongoPosts";

Grid.mongo = mongoose.mongo;

const mongoURI =
  "mongodb+srv://admin:i9LKxKhNwqpRVwG@cluster0.qpq3w.mongodb.net/fb-mern?retryWrites=true&w=majority";

const conn = mongoose.createConnection(mongoURI, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connect(mongoURI, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.once("open", () => {
  console.log("DB connected");
});

conn.once("open", () => {
  console.log("DB connected");
  let gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("images");
});

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `image-${Date.now()}${path.extname(file.originalname)}`;

      const fileInfo = {
        filename: filename,
        bucketName: "images"
      };
      resolve(fileInfo);
    });
  }
});

// App config

const app = express();
const port = process.env.PORT || 9000;

// middlewares

app.use(bodyparser.json());
app.use(cors());

const upload = multer({ storage });

// api endpoint

app.get("/", (req, res) => res.status(200).send("hello world"));

app.post("/upload/image", upload.single("file"), (req, res) => {
  res.status(201).send(req.file);
});

app.post("/upload/post", (req, res) => {
  const dbPost = req.body;
  //   console.log(dbPost);
  mongoPosts.create(dbPost, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

app.get("/retrive/image/single", (req, res) => {
  gfs.files.findOne({ filename: req.query.name }, (err, file) => {
    if (err) {
      res.status(500).send(err);
    } else {
      if (!file || file.length === 0) {
        res.status(404).json({ err: "file not found" });
      } else {
        const readstream = gfs.createReadtream(file.filename);
        readstream.pipe(res);
      }
    }
  });
});
app.post("/retrive/post", (req, res) => {
  mongoPosts.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      data.sort((b, a) => {
        return a.timestamp - b.timestamp;
      });
      res.status(200).send(data);
    }
  });
});

app.listen(port, () => console.log(` listening on localhost:${port}`));
