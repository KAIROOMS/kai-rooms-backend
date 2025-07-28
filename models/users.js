const mongoose = require('mongoose'); // ✅ baris ini penting!

const userSchema = new mongoose.Schema({
  nama: String,
  email: { type: String, unique: true },
  telepon: String,
  password: String,
  verificationCode: String,
  verified: { type: Boolean, default: false },
  avatar: String,
  departemen: String,
  isGoogleUser: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isApproved: {  // ✅ field baru
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('User', userSchema);
