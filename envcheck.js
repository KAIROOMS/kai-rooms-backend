const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Ada" : "❌ Tidak ada");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Ada" : "❌ Tidak ada");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "✅ Ada" : "❌ Tidak ada");
