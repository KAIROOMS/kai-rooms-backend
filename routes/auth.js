const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const { generateToken } = require("../middleware/auth");
require("dotenv").config();

const apiUrl = process.env.API_URL || "http://localhost:5000";
const frontendUrl = process.env.FRONTEND_URL || "kai-rooms.vercel.app";

// Rute untuk memulai OAuth Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback setelah Google OAuth dengan error handling yang lebih baik
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", (err, user, info) => {
      if (err) {
        console.error("❌ OAuth Error:", err);
        console.error("Error details:", {
          message: err.message,
          stack: err.stack,
          data: err.data
        });
        return res.redirect(`${frontendUrl}/auth/error?message=OAuth%20Authentication%20Failed`);
      }
      
      if (!user) {
        console.error("❌ No user returned from OAuth");
        return res.redirect(`${frontendUrl}/auth/error?message=Authentication%20Failed`);
      }
      
      req.user = user;
      next();
    })(req, res, next);
  },
  async (req, res) => {
    try {
      console.log("🔄 Google callback berhasil, user:", req.user.email);
      
      // 💥 Cek apakah akun sudah disetujui oleh admin, KECUALI kalau dia admin
      const adminEmails = ["sbilla241@gmail.com", "kairoomsmeet@gmail.com"];
      if (!req.user.isApproved && !adminEmails.includes(req.user.email)) {
        console.warn("❌ Akun belum disetujui admin:", req.user.email);
        return res.redirect(`${frontendUrl}/auth/error?message=Akun%20belum%20disetujui%20oleh%20admin.`);
      }

      // ✅ Generate JWT token
      const token = generateToken(req.user._id);

      // ✅ Buat object user yang aman untuk dikirim ke frontend
      const userInfo = {
        id: req.user._id,
        nama: req.user.nama,
        email: req.user.email,
        avatar: req.user.avatar,
        verified: req.user.verified,
        isGoogleUser: req.user.isGoogleUser,
        telepon: req.user.telepon,
        departemen: req.user.departemen,
      };

      let redirectUrl;

if(process.env.NODE_ENV === "production") {
  redirectUrl = `https://kai-rooms.vercel.app/auth/success?token=${token}&user=${encodeURIComponent(
        JSON.stringify(userInfo)
      )}`;
}else {
  redirectUrl = `http://localhost:3000/auth/success?token=${token}&user=${encodeURIComponent(
        JSON.stringify(userInfo)
      )}`  
}
      // const redirectUrl = `${frontendUrl}/auth/success?token=${token}&user=${encodeURIComponent(
      //   JSON.stringify(userInfo)
      // )}`;

      console.log("🔄 Redirecting to:", redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("❌ Error generating token:", error);
      res.redirect(`${frontendUrl}/auth/error?message=Token%20Generation%20Failed`);
    }
  }
);

// Rute untuk logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    console.log("✅ Logout successful");
    res.json({ message: "Logout successful" });
  });
});

// Rute untuk cek status authentication
router.get("/status", (req, res) => {
  if (req.user) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;