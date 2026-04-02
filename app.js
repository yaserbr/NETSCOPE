const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const allowedOrigins = [
  "https://netscope-production-4c3d.up.railway.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow Electron / Postman (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  }
}));


app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// مافيه تحليل يدوي الآن

module.exports = app;