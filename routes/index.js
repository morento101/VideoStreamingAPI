var express = require("express");
var path = require("path");
const fs = require("fs");
const mongodb = require("mongodb");
require("dotenv").config();

const dbPassword = process.env.dbPassword;
const uri = `mongodb+srv://yaroslav:${dbPassword}@birthdayreminder.lyakbce.mongodb.net/?retryWrites=true&w=majority`;

var router = express.Router();

const videoPath = "./This is America.mp4";

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "/views/index.html"));
});

router.get("/add-video", async function (req, res) {
  const client = new mongodb.MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: mongodb.ServerApiVersion.v1,
  });

  await client.connect((err) => {
    if (err) {
      res.json(err);
      return;
    }
  });

  const db = client.db("videos");
  const bucket = new mongodb.GridFSBucket(db);
  const videoUploadStream = bucket.openUploadStream(
    videoPath.split("/").slice(-1).pop()
  );
  const videoReadStream = fs.createReadStream(videoPath);
  videoReadStream.pipe(videoUploadStream);
  client.close();

  res.status(200).send("Done...");
});

router.get("/video", async function (req, res) {
  const client = new mongodb.MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: mongodb.ServerApiVersion.v1,
  });

  client.connect((err) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
  });

  const range = req.headers.range;
  if (!range) {
    res.status(400).send("Requires Range header");
  }

  const db = client.db("videos");
  let video = await db.collection("fs.files").findOne();

  if (!video) {
    res.status(404).send("No video uploaded!");
    return;
  }

  const videoSize = video.length;
  const start = Number(range.replace(/\D/g, ""));
  const end = videoSize - 1;

  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  res.writeHead(206, headers);

  const bucket = new mongodb.GridFSBucket(db);
  const downloadStream = bucket.openDownloadStreamByName(
    "This is America.mp4",
    {
      start,
    }
  );

  downloadStream.pipe(res);
});

module.exports = router;
