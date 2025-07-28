const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  penyelenggara: String,
  namaRapat: String,
  tanggal: String,
  waktuMulai: String,
  waktuSelesai: String,
  lokasi: String,
  ruangan: String,
  jenisRapat: String,
  kapasitas: Number,
  catatan: String,
  linkMeet: String // optional
});


module.exports = mongoose.model('Booking', bookingSchema);
