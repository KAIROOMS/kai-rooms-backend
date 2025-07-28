const jwt = require("jsonwebtoken");
const User = require("../models/users");

// ✅ Validasi JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET tidak ditemukan di environment variables");
  process.exit(1);
}

const generateToken = (userId) => {
  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
    console.log("✅ JWT Token generated for user:", userId);
    return token;
  } catch (error) {
    console.error("❌ Error generating token:", error);
    throw error;
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid token. User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Error verifying token:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = { generateToken, verifyToken };