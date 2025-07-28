const express = require("express");
const router = express.Router();
const User = require("../models/users");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const { generateToken, verifyToken } = require("../middleware/auth");


// === Setup multer untuk upload foto ===
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "kairooms_avatars", // nama folder di Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
    public_id: (req, file) => {
      return `avatar_${req.user.id}_${Date.now()}`; // nama file unik
    },
  },
});

const upload = multer({ storage });

// === REGISTER ===
router.post("/register", async (req, res) => {
  const { nama, email, telepon, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "Email sudah terdaftar." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

    const newUser = new User({
      nama,
      email,
      telepon,
      password: hashedPassword,
      verificationCode,
      verified: false,
    });

    await newUser.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Kode Verifikasi KAI ROOMS",
      html: `<p>Halo ${nama},</p><p>Berikut kode verifikasi akun kamu:</p><h2>${verificationCode}</h2>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "User terdaftar. Kode verifikasi dikirim ke email.",
      userId: newUser._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mendaftar user." });
  }
});

// === VERIFIKASI KODE ===
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User tidak ditemukan." });
    if (user.verificationCode !== code)
      return res.status(400).json({ message: "Kode verifikasi salah." });

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    res.json({ message: "✅ Verifikasi berhasil! Kamu bisa login." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal verifikasi akun." });
  }
});

// === LOGIN MANUAL ===
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Email tidak ditemukan." });

    // ❗ Tambahan agar akun Google tidak bisa login manual
    if (user.isGoogleUser) {
      return res.status(403).json({
        message: "Akun ini dibuat dengan Google. Silakan login dengan Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Password salah." });

    if (!user.verified) {
    return res.status(403).json({ message: "Akun belum diverifikasi. Silakan cek email Anda." });
    }

    if (!user.isApproved) {
    return res.status(403).json({ message: "Akun belum disetujui oleh admin. Silakan tunggu persetujuan." });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      message: "✅ Login berhasil!",
      user: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        telepon: user.telepon,
        avatar: user.avatar,
        departemen: user.departemen,
        verified: user.verified,
        isGoogleUser: user.isGoogleUser,
         isApproved: user.isApproved,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan saat login." });
  }
});

// === GET USER PROFILE (Protected) ===
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil profil user." });
  }
});

// === UPDATE PROFIL ===
router.put("/update-profile/:id", verifyToken, async (req, res) => {
  console.log("🔐 Middleware berhasil. req.user: ", req.user);
  console.log("💡 req.params.id:", req.params.id);
  const { nama, email, telepon, departemen } = req.body;
  try {
    // Pastikan user hanya bisa update profil sendiri
    if (req.user._id.toString() !== req.params.id) {
      console.log("⛔ User ID tidak cocok. Akses ditolak.");
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { nama, email, telepon, departemen },
      { new: true }
    ).select("-password");

    res.json({ message: "Profil berhasil diperbarui.", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui profil." });
  }
});

// === UPLOAD FOTO AVATAR ===
router.post(
  "/upload-avatar/:id",
  verifyToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      console.log("🧠 Token verified:");
      console.log("req.user:", req.user);
      console.log("req.params.id:", req.params.id);
      
      // Pastikan user hanya bisa upload avatar sendiri
      if (req.user._id.toString() !== req.params.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { avatar: req.file.path },
        { new: true }
      ).select("-password");

      res.json({
        message: "Foto profil berhasil diunggah.",
        avatar: user.avatar,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Gagal upload foto profil." });
    }
  }
);
// === HAPUS AVATAR ===
router.delete("/remove-avatar/:id", verifyToken, async (req, res) => {
  try {
    // Pastikan user hanya bisa hapus avatar milik sendiri
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    // Hapus dari Cloudinary jika ada
    if (user.avatar) {
      const publicIdMatch = user.avatar.match(/kairooms_avatars\/([^\.\/]+)/);
      const publicId = publicIdMatch ? `kairooms_avatars/${publicIdMatch[1]}` : null;

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    // Hapus avatar di MongoDB
    user.avatar = null;
    await user.save();

    res.json({ message: "✅ Avatar berhasil dihapus." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Gagal menghapus avatar." });
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// === LUPA PASSWORD ===
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ message: "Jika email terdaftar, instruksi reset sudah dikirim." });
    }

    // Cegah reset password untuk akun Google
    if (user.isGoogleUser) {
      return res.status(403).json({ message: "Akun Google tidak bisa reset password manual." });
    }

    const token = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 jam
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Reset Password KAI ROOMS",
      html: `<p>Halo ${user.nama},</p>
             <p>Klik link berikut untuk reset password (berlaku 1 jam):</p>
             <a href="${resetLink}">${resetLink}</a>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "✅ Instruksi reset password telah dikirim ke email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Gagal memproses permintaan." });
  }
});

// === RESET PASSWORD ===
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // token masih berlaku
    });

    if (!user) {
      return res.status(400).json({ message: "Token tidak valid atau sudah kedaluwarsa." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "✅ Password berhasil direset. Silakan login kembali." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Gagal reset password." });
  }
});

// === ADMIN: Setujui user ===
router.put("/approve-user/:id", verifyToken, async (req, res) => {
  try {
    // ❗ Pastikan hanya admin yang bisa melakukan ini
    const adminEmails = ["sbilla241@gmail.com", "kairoomsmeet@gmail.com"]; // ganti sesuai email kamu & KAI
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ message: "❌ Hanya admin yang dapat menyetujui user." });
    }

    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    if (user.isApproved) {
      return res.status(400).json({ message: "User sudah disetujui." });
    }

    user.isApproved = true;
    await user.save();

    res.json({ message: "✅ User berhasil disetujui." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Gagal menyetujui user." });
  }
});

// === GET SEMUA USER YANG BELUM DI-APPROVE (Admin only) ===
router.get("/pending-users", verifyToken, async (req, res) => {
  try {
    // 👉 Cek apakah user yang login adalah admin
    const adminEmails = ["sbilla241@gmail.com", "kairoomsmeet@gmail.com"];
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ message: "Akses ditolak. Bukan admin." });
    }

    const pendingUsers = await User.find({
      verified: true,
      isApproved: false,
    }).select("-password -verificationCode -resetPasswordToken -resetPasswordExpires");

    res.json({ users: pendingUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Gagal mengambil data user." });
  }
});

module.exports = router;