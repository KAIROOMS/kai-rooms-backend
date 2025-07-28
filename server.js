require("dotenv").config(); // ✅ Pindahkan ke paling atas

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");

// ✅ Cek apakah env variables sudah terbaca
console.log("🔍 Checking environment variables:");
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Not set"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Not set"
);
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Not set");
console.log(
  "SESSION_SECRET:",
  process.env.SESSION_SECRET ? "✅ Set" : "❌ Not set"
);

const passport = require("./config/passport");

const bookingRoutes = require("./routes/booking");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    credentials: true,
  })
);
app.use(bodyParser.json());

// Session middleware (dibutuhkan untuk Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set true jika menggunakan HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 jam
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Koneksi MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/booking", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

// Static files
app.use("/uploads", express.static("uploads"));

// Health check route
app.get("/health", (req, res) => {
  res.json({ message: "Server is running!", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
});

