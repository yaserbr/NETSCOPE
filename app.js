const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({
  origin: [
    "https://netscope-production-4c3d.up.railway.app"
  ]
}));
app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// مافيه تحليل يدوي الآن

module.exports = app;