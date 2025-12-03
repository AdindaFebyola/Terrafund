const express = require('express');
const router = express.Router();
const relawanController = require('../controllers/relawan.controller');
const { authenticate, requireSelf } = require('../middleware/auth');

// Middleware Global: Semua route di bawah ini butuh login (token valid)
router.use(authenticate);

// === DATA UTAMA RELAWAN ===
// Mengambil data lengkap relawan (Profil + Statistik + Wallet + Misi)
router.get('/:userId', requireSelf('relawan'), relawanController.getFullRelawanData);

// === DASHBOARD & PROFIL ===
router.get('/:userId/dashboard', requireSelf('relawan'), relawanController.getDashboard);
router.get('/:userId/profile', requireSelf('relawan'), relawanController.getProfile);
router.put('/:userId/profile', requireSelf('relawan'), relawanController.updateProfile);

// === KEUANGAN (WALLET & TRANSAKSI) ===
router.get('/:userId/wallet', requireSelf('relawan'), relawanController.getWallet);
router.get('/:userId/transactions', requireSelf('relawan'), relawanController.getTransactions);

// === STATUS KEGIATAN ===
router.get('/:userId/verifikasi', requireSelf('relawan'), relawanController.getVerificationStatus);

// === MANAJEMEN PROYEK (BARU DITAMBAHKAN) ===
// Endpoint agar relawan bisa bergabung ke proyek tertentu
// Body: { "project_id": 123 }
router.post('/:userId/projects', requireSelf('relawan'), relawanController.joinProject);

// Endpoint untuk melihat daftar proyek yang sedang diikuti relawan
router.get('/:userId/projects', requireSelf('relawan'), relawanController.getMyProjects);

module.exports = router;