// controllers/donatur.controller.js
const db = require('../database');

// GET /api/donatur/:userId/dashboard
exports.getDashboard = async (req, res) => {
  const { userId } = req.params;

  try {
    // Pastikan user adalah donatur
    const [[user]] = await db.query(
      `SELECT id, name, level, xp 
       FROM users 
       WHERE id = ? AND role = 'donatur'`,
      [userId]
    );
    if (!user) {
      return res.status(404).json({ message: 'Donatur tidak ditemukan' });
    }

    // Total donasi sukses
    const [[donasiStats]] = await db.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS total_donasi,
         COALESCE(COUNT(DISTINCT project_id), 0) AS total_proyek
       FROM donations
       WHERE user_id = ? AND payment_status = 'paid'`,
      [userId]
    );

    // Total TTK reward
    const [[rewardStats]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_reward
       FROM wallet_transactions
       WHERE user_id = ? AND tx_type = 'reward' AND status = 'paid'`,
      [userId]
    );

    // Proyek yang didukung
    const [projects] = await db.query(
      `SELECT 
         p.id,
         p.title,
         p.location,
         o.name AS organization_name,
         p.thumbnail
       FROM donations d
       JOIN projects p ON d.project_id = p.id
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE d.user_id = ? AND d.payment_status = 'paid'
       GROUP BY p.id, p.title, p.location, o.name, p.thumbnail
       ORDER BY MAX(d.created_at) DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      name: user.name,
      level: user.level,
      xp: user.xp,
      total_donasi: donasiStats.total_donasi,
      total_proyek: donasiStats.total_proyek,
      total_reward_ttk: rewardStats.total_reward,
      projects,
    });
  } catch (err) {
    console.error('getDashboardDonatur error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getDonations = async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         d.id,
         p.title AS project_title,
         d.created_at AS tanggal,
         d.amount AS nominal,
         d.payment_status AS status
       FROM donations d
       JOIN projects p ON d.project_id = p.id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('getDonations error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getTransactions = async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         tx_code AS id_transaksi,
         created_at AS tanggal,
         amount AS nominal,
         tx_type AS tipe,   -- 'donation' / 'reward' / ...
         status
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('getTransactionsDonatur error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getProfile = async (req, res) => {
  const { userId } = req.params;

  try {
    const [[user]] = await db.query(
      `SELECT 
         id,
         name,
         email,
         phone,
         address
       FROM users
       WHERE id = ? AND role = 'donatur'`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Donatur tidak ditemukan' });
    }

    res.json(user);
  } catch (err) {
    console.error('getProfileDonatur error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// PUT /api/donatur/:userId/profil
exports.updateProfile = async (req, res) => {
  const { userId } = req.params;
  const { name, phone, address } = req.body;

  try {
    await db.query(
      `UPDATE users
       SET 
         name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         updated_at = NOW()
       WHERE id = ? AND role = 'donatur'`,
      [name, phone, address, userId]
    );

    const [[updated]] = await db.query(
      `SELECT id, name, email, phone, address
       FROM users
       WHERE id = ?`,
      [userId]
    );

    res.json(updated);
  } catch (err) {
    console.error('updateProfileDonatur error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// GET /api/donatur/:userId (full data)
exports.getFullDonorData = async (req, res) => {
  const { userId } = req.params;

  try {
    // 1) Profil donatur
    const [[user]] = await db.query(
      `SELECT 
         id,
         name,
         email,
         phone,
         address,
         city,
         province,
         wallet_address,
         level,
         xp,
         role
       FROM users
       WHERE id = ? AND role = 'donatur'`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Donatur tidak ditemukan' });
    }

    // 2) Statistik donasi & reward
    const [[donationStats]] = await db.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS total_donation,
         COALESCE(COUNT(DISTINCT project_id), 0) AS total_projects
       FROM donations
       WHERE user_id = ? AND payment_status = 'paid'`,
      [userId]
    );

    const [[rewardStats]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_reward_ttk
       FROM wallet_transactions
       WHERE user_id = ? AND tx_type = 'reward' AND status = 'paid'`,
      [userId]
    );

    // 3) Proyek yang didukung
    const [projects] = await db.query(
      `SELECT 
         p.id,
         p.title,
         p.location,
         o.name AS organization_name,
         p.thumbnail
       FROM donations d
       JOIN projects p ON d.project_id = p.id
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE d.user_id = ? AND d.payment_status = 'paid'
       GROUP BY p.id, p.title, p.location, o.name, p.thumbnail
       ORDER BY MAX(d.created_at) DESC`,
      [userId]
    );

    // 4) Donasi saya
    const [donations] = await db.query(
      `SELECT 
         d.id,
         p.title AS project_title,
         d.amount AS nominal,
         d.payment_status AS status,
         d.created_at AS tanggal
       FROM donations d
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`,
      [userId]
    );

    // 5) Riwayat transaksi
    const [transactions] = await db.query(
      `SELECT 
         id,
         tx_code,
         tx_type,
         description,
         amount,
         status,
         created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    // RESPONSE
    res.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        province: user.province,
        wallet_address: user.wallet_address,
        level: user.level,
        xp: user.xp,
      },
      stats: {
        total_donation: donationStats.total_donation,
        total_projects: donationStats.total_projects,
        total_reward_ttk: rewardStats.total_reward_ttk,
      },
      projects,
      donations,
      transactions,
    });
  } catch (err) {
    console.error('getFullDonorData error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};
