require("dotenv").config();
const app = require("./api/index.js"); // import express app

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
