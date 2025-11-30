const mysql = require('mysql2');

// Buat koneksi pool (lebih efisien daripada koneksi tunggal)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Default user XAMPP
    password: '',      // Default password XAMPP (kosong)
    database: 'terrafund_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Ubah jadi Promise agar bisa pakai async/await nanti
const db = pool.promise();

console.log("Mencoba menghubungkan ke MySQL...");

module.exports = db;