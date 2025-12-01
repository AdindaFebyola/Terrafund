const express = require('express');
const router = express.Router();
const ngoController = require('../controllers/ngo.controller');
const { authenticate } = require('../middleware/auth'); 

// Middleware Global untuk rute ini: Harus Login
router.use(authenticate);

// Middleware Otorisasi: Pastikan yang akses adalah role 'ngo'
router.use('/:userId', (req, res, next) => {
    // Cek apakah user yang login punya role 'ngo'
    // Asumsi req.user diisi oleh middleware authenticate dari token JWT
    if (req.user.role !== 'ngo') {
        return res.status(403).json({ message: 'Akses ditolak. Khusus NGO.' });
    }
    // Opsional: Cek apakah userId di params sama dengan id user yang login
    if (parseInt(req.params.userId) !== req.user.id) {
        return res.status(403).json({ message: 'Akses tidak sah ke data pengguna lain.' });
    }
    next();
});

// === DAFTAR ENDPOINT NGO ===

// 1. Dashboard Utama
router.get('/:userId/dashboard', ngoController.getDashboardStats);

// 2. Manajemen Proyek
router.get('/:userId/projects', ngoController.getProjects);
router.post('/:userId/projects', ngoController.createProject);

// 3. Data Relawan
router.get('/:userId/relawan', ngoController.getVolunteers);

// 4. Keuangan & Klaim Dana
router.get('/:userId/financial', ngoController.getFinancialDashboard);
router.post('/:userId/withdraw', ngoController.withdrawFund);

module.exports = router;