const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("../config/passport");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });



// Debug env check
console.log("🔍 Checking environment variables:");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Not set");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Not set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Not set");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "✅ Set" : "❌ Not set");
console.log("✅ Loaded .env file from:", path.join(__dirname, "..", ".env"));
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);



const app = express();

// ✅ CORS untuk Vercel (bisa sesuaikan)
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(bodyParser.json());

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Routes
app.use("/api/booking", require("../routes/booking"));
app.use("/api/users", require("../routes/users"));
app.use("/api/auth", require("../routes/auth"));

// ✅ Static file serving (Cloudinary lebih disarankan, tapi ini tetap bisa)
app.use("/uploads", express.static("uploads"));

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running!", timestamp: new Date() });
});

// ✅ Export untuk Vercel
module.exports = app;
module.exports.handler = serverless(app);
