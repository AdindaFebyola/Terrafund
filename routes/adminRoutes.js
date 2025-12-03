const express = require('express');
const router = express.Router();
// Pastikan path ke controller benar (mundur satu folder, lalu masuk controllers)
const adminController = require('../controllers/adminController'); 
// PERBAIKAN DI SINI: Gunakan kurung kurawal { } untuk mengambil fungsi 'authenticate' saja
const { authenticate } = require('../middleware/auth'); 

// Middleware tambahan: Pastikan yang akses cuma ADMIN
const verifyAdmin = (req, res, next) => {
    // req.user didapat dari middleware 'authenticate' sebelumnya
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Akses Ditolak. Khusus Admin.' });
    }
};

// Rute: GET /api/admin/projects/pending
// Urutan: Cek Token Dulu (authenticate) -> Cek Role Admin (verifyAdmin) -> Jalankan Controller
router.get('/projects/pending', authenticate, verifyAdmin, adminController.getPendingProjects);

// Rute: PUT /api/admin/projects/:projectId/verify
router.put('/projects/:projectId/verify', authenticate, verifyAdmin, adminController.verifyProject);

module.exports = router;