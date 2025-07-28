const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/users");

// ✅ Validasi environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error("❌ GOOGLE_CLIENT_ID tidak ditemukan di environment variables");
  process.exit(1);
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error(
    "❌ GOOGLE_CLIENT_SECRET tidak ditemukan di environment variables"
  );
  process.exit(1);
}

console.log("✅ Google OAuth credentials loaded successfully");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("📄 Google Profile:", {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          photo: profile.photos[0].value,
        });

        // Cek apakah user sudah ada
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log("👤 User sudah ada, update info Google");
          // Jika user sudah ada, update info Google
          user.isGoogleUser = true;
          user.verified = true;
          if (!user.avatar || user.avatar.startsWith("http")) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        } else {
          console.log("👤 User baru, buat akun baru");
          // Jika user baru, buat akun baru
          const newUser = new User({
            nama: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            verified: true,
            isGoogleUser: true,
            password: null,
          });

          await newUser.save();
          console.log("✅ User baru berhasil dibuat");
          return done(null, newUser);
        }
      } catch (error) {
        console.error("❌ Error in Google Strategy:", error);
        return done(error, null);
      }
    }
  )
);

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); // ✅ Ambil lengkap dari DB
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("🔄 Deserialize user ID:", id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error("❌ Error deserializing user:", error);
    done(error, null);
  }
});

module.exports = passport;