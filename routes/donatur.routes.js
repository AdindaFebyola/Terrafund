// routes/donatur.routes.js
const express = require('express');
const router = express.Router();
const donaturController = require('../controllers/donatur.controller');
const { authenticate, requireSelf } = require('../middleware/auth');

// Semua endpoint donatur butuh token dan hanya boleh akses diri sendiri
router.use(authenticate);
router.use(requireSelf('donatur'));

router.get('/:userId', donaturController.getFullDonorData);
router.get('/:userId/dashboard', donaturController.getDashboard);

router.get('/:userId/donasi', donaturController.getDonations);

router.get('/:userId/history', donaturController.getTransactions);

router.get('/:userId/profil', donaturController.getProfile);
router.put('/:userId/profil', donaturController.updateProfile);

module.exports = router;
