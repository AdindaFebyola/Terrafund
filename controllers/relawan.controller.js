const db = require('../database');

exports.getDashboard = async (req, res) => {
  const { userId } = req.params;

  try {
    const [[walletRow]] = await db.query('SELECT COALESCE(SUM(amount), 0) AS total_ttk FROM wallet_transactions WHERE user_id = ?', [userId]);

    const [[missionStats]] = await db.query(
      `SELECT 
         COALESCE(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) AS missions_done,
         COALESCE(COUNT(CASE WHEN status = 'active' THEN 1 END), 0) AS missions_active,
         COALESCE(SUM(hours), 0) AS total_hours
       FROM user_projects
       WHERE user_id = ?`,
      [userId]
    );

    const [[userRow]] = await db.query('SELECT name, level, xp FROM users WHERE id = ? AND role = "relawan"', [userId]);

    if (!userRow) {
      return res.status(404).json({ message: 'Relawan tidak ditemukan' });
    }

    const [missions] = await db.query(
      `SELECT 
         p.id,
         p.title,
         p.location,
         o.name AS organization_name,
         up.status,
         up.verification_status,
         up.hours,
         up.joined_at,
         up.completed_at
       FROM user_projects up
       JOIN projects p ON up.project_id = p.id
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE up.user_id = ?
       ORDER BY up.joined_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      name: userRow.name,
      level: userRow.level,
      xp: userRow.xp,
      total_ttk: walletRow.total_ttk,
      missions_done: missionStats.missions_done,
      missions_active: missionStats.missions_active,
      total_hours: missionStats.total_hours,
      missions,
    });
  } catch (err) {
    console.error('getDashboard error', err);
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
         birth_date,
         address,
         city,
         province,
         level,
         xp,
         role
       FROM users
       WHERE id = ? AND role = 'relawan'`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Relawan tidak ditemukan' });
    }

    const [[missionStats]] = await db.query(
      `SELECT 
         COALESCE(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) AS missions_done,
         COALESCE(SUM(hours), 0) AS total_hours
       FROM user_projects
       WHERE user_id = ?`,
      [userId]
    );

    const [[walletRow]] = await db.query('SELECT COALESCE(SUM(amount), 0) AS total_ttk FROM wallet_transactions WHERE user_id = ?', [userId]);

    res.json({
      ...user,
      missions_done: missionStats.missions_done,
      total_hours: missionStats.total_hours,
      total_ttk: walletRow.total_ttk,
    });
  } catch (err) {
    console.error('getProfile error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.updateProfile = async (req, res) => {
  const { userId } = req.params;
  const { name, phone, birth_date, address, city, province } = req.body;

  try {
    await db.query(
      `UPDATE users
       SET 
         name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         birth_date = COALESCE(?, birth_date),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         province = COALESCE(?, province)
       WHERE id = ? AND role = 'relawan'`,
      [name, phone, birth_date, address, city, province, userId]
    );

    const [[updated]] = await db.query(
      `SELECT id, name, email, phone, birth_date, address, city, province, level, xp
       FROM users
       WHERE id = ?`,
      [userId]
    );

    res.json(updated);
  } catch (err) {
    console.error('updateProfile error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getWallet = async (req, res) => {
  const { userId } = req.params;

  try {
    const [[walletRow]] = await db.query('SELECT COALESCE(SUM(amount), 0) AS total_ttk FROM wallet_transactions WHERE user_id = ?', [userId]);

    const [transactions] = await db.query(
      `SELECT 
         id,
         description,
         amount,
         created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      total_ttk: walletRow.total_ttk,
      transactions,
    });
  } catch (err) {
    console.error('getWallet error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getTransactions = async (req, res) => {
  const { userId } = req.params;

  try {
    const [transactions] = await db.query(
      `SELECT 
         id,
         description,
         amount,
         created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(transactions);
  } catch (err) {
    console.error('getTransactions error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getVerificationStatus = async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         p.title,
         p.start_date,
         up.verification_status,
         up.completed_at,
         up.joined_at
       FROM user_projects up
       JOIN projects p ON up.project_id = p.id
       WHERE up.user_id = ?
       ORDER BY up.completed_at DESC, up.joined_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('getVerificationStatus error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getFullRelawanData = async (req, res) => {
  const { userId } = req.params;

  try {
    const [[user]] = await db.query(
      `SELECT 
         id,
         name,
         email,
         phone,
         birth_date,
         address,
         city,
         province,
         level,
         xp,
         role
       FROM users
       WHERE id = ? AND role = 'relawan'`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'Relawan tidak ditemukan' });
    }

    const [[missionStats]] = await db.query(
      `SELECT 
         COALESCE(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) AS missions_done,
         COALESCE(COUNT(CASE WHEN status = 'active' THEN 1 END), 0) AS missions_active,
         COALESCE(SUM(hours), 0) AS total_hours
       FROM user_projects
       WHERE user_id = ?`,
      [userId]
    );

    const [[walletRow]] = await db.query('SELECT COALESCE(SUM(amount), 0) AS total_ttk FROM wallet_transactions WHERE user_id = ?', [userId]);

    const [transactions] = await db.query(
      `SELECT 
         id,
         description,
         amount,
         created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const [missions] = await db.query(
      `SELECT 
         p.id,
         p.title,
         p.location,
         o.name AS organization_name,
         up.status,
         up.verification_status,
         up.hours,
         up.joined_at,
         up.completed_at
       FROM user_projects up
       JOIN projects p ON up.project_id = p.id
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE up.user_id = ?
       ORDER BY up.joined_at DESC`,
      [userId]
    );

    const verification = missions.map((m) => ({
      title: m.title,
      verification_status: m.verification_status,
      completed_at: m.completed_at,
      joined_at: m.joined_at,
    }));

    res.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        birth_date: user.birth_date,
        address: user.address,
        city: user.city,
        province: user.province,
        level: user.level,
        xp: user.xp,
      },
      stats: {
        missions_done: missionStats.missions_done,
        missions_active: missionStats.missions_active,
        total_hours: missionStats.total_hours,
        total_ttk: walletRow.total_ttk,
      },
      wallet: {
        total_ttk: walletRow.total_ttk,
        transactions,
      },
      missions,
      verification,
    });
  } catch (err) {
    console.error('getFullRelawanData error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// POST /api/relawan/:userId/projects
// body: { "project_id": 3 }
exports.joinProject = async (req, res) => {
  const { userId } = req.params;
  const { project_id } = req.body;

  if (!project_id) {
    return res.status(400).json({ message: 'project_id wajib diisi' });
  }

  try {
    // cek sudah ikut belum
    const [[existing]] = await db.query('SELECT id FROM user_projects WHERE user_id = ? AND project_id = ?', [userId, project_id]);

    if (existing) {
      return res.status(409).json({ message: 'Kamu sudah ikut proyek ini.' });
    }

    await db.query(
      `INSERT INTO user_projects (user_id, project_id, status, verification_status)
       VALUES (?, ?, 'active', 'pending')`,
      [userId, project_id]
    );

    res.status(201).json({ message: 'Berhasil ikut proyek.' });
  } catch (err) {
    console.error('joinProject error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};
