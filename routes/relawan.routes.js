const express = require('express');
const router = express.Router();
const relawanController = require('../controllers/relawan.controller');
const { authenticate, requireSelf } = require('../middleware/auth');

router.use(authenticate);

router.get('/:userId', requireSelf('relawan'), relawanController.getFullRelawanData);
router.get('/:userId/dashboard', requireSelf('relawan'), relawanController.getDashboard);

router.get('/:userId/profile', requireSelf('relawan'), relawanController.getProfile);
router.put('/:userId/profile', requireSelf('relawan'), relawanController.updateProfile);

router.get('/:userId/wallet', requireSelf('relawan'), relawanController.getWallet);
router.get('/:userId/transactions', requireSelf('relawan'), relawanController.getTransactions);
router.get('/:userId/verifikasi', requireSelf('relawan'), relawanController.getVerificationStatus);

router.post('/:userId/projects', requireSelf('relawan'), relawanController.joinProject);

module.exports = router;
