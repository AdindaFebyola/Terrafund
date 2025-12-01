const db = require('../database');

// Helper: Mendapatkan ID Organisasi
// Catatan: Dalam ERD kamu ada tabel 'organizations'. 
// Jika user NGO login, kita perlu tahu dia mewakili organization_id yang mana.
// Untuk simplifikasi, kita bisa anggap id di tabel 'organizations' == id user NGO, 
// atau kita cari relasinya dulu. Di sini saya pakai asumsi user.id digunakan untuk identifikasi.
async function getOrgId(userId) {
  // Jika kamu punya tabel relasi, query dulu di sini. 
  // Misal: const [[org]] = await db.query('SELECT id FROM organizations WHERE user_id = ?', [userId]);
  // return org ? org.id : null;
  
  return userId; // Asumsi sederhana: ID User NGO = Organization ID
}

// GET /api/ngo/:userId/dashboard
// Menampilkan statistik: Total Proyek, Dana Terkumpul, Relawan Aktif
exports.getDashboardStats = async (req, res) => {
  const { userId } = req.params;

  try {
    const orgId = await getOrgId(userId);

    // 1. Statistik Ringkasan
    const [[stats]] = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM projects WHERE organization_id = ?) AS total_proyek,
         
         (SELECT COALESCE(SUM(d.amount), 0) 
          FROM donations d 
          JOIN projects p ON d.project_id = p.id 
          WHERE p.organization_id = ? AND d.payment_status = 'paid') AS dana_terkumpul,
          
         (SELECT COUNT(DISTINCT up.user_id) 
          FROM user_projects up 
          JOIN projects p ON up.project_id = p.id 
          WHERE p.organization_id = ? AND up.status = 'active') AS relawan_aktif
       `,
      [orgId, orgId, orgId]
    );

    // 2. Daftar Proyek Terbaru (Limit 5 untuk dashboard)
    const [recentProjects] = await db.query(
      `SELECT id, title, target_amount, current_amount, status, created_at 
       FROM projects 
       WHERE organization_id = ? 
       ORDER BY created_at DESC LIMIT 5`,
      [orgId]
    );

    res.json({
      summary: {
        total_proyek: stats.total_proyek,
        dana_terkumpul: stats.dana_terkumpul,
        relawan_aktif: stats.relawan_aktif
      },
      recent_projects: recentProjects
    });

  } catch (err) {
    console.error('getDashboardNGO error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// GET /api/ngo/:userId/projects
// Menampilkan manajemen proyek (List Card Proyek)
exports.getProjects = async (req, res) => {
  const { userId } = req.params;

  try {
    const orgId = await getOrgId(userId);

    const [projects] = await db.query(
      `SELECT 
         p.id,
         p.title,
         p.target_amount,
         p.current_amount,
         p.location,
         p.end_date,
         p.status,
         p.thumbnail,
         (SELECT COUNT(*) FROM user_projects up WHERE up.project_id = p.id) as total_relawan,
         CAST((p.current_amount / p.target_amount * 100) AS UNSIGNED) as percentage
       FROM projects p
       WHERE p.organization_id = ?
       ORDER BY p.created_at DESC`,
      [orgId]
    );

    res.json(projects);
  } catch (err) {
    console.error('getProjectsNGO error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// POST /api/ngo/:userId/projects
// Membuat proyek baru
// POST /api/ngo/:userId/projects
exports.createProject = async (req, res) => {
  const { userId } = req.params;
  
  // 1. TAMBAHKAN category_id DI SINI
  const { title, description, target_amount, location, duration_months, start_date, end_date, thumbnail, category_id } = req.body;

  try {
    // Validasi sederhana: Pastikan category_id dikirim
    if (!category_id) {
        return res.status(400).json({ message: 'Category ID wajib diisi.' });
    }

    const orgId = await getOrgId(userId);

    // 2. UPDATE QUERY SQL: Masukkan category_id ke dalam kolom dan values
    const [result] = await db.query(
      `INSERT INTO projects 
       (organization_id, category_id, title, description, target_amount, current_amount, location, duration_months, start_date, end_date, thumbnail, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orgId, category_id, title, description, target_amount, location, duration_months, start_date, end_date, thumbnail]
    );

    res.status(201).json({
      status: 'Sukses',
      message: 'Proyek berhasil dibuat',
      project_id: result.insertId
    });

  } catch (err) {
    console.error('createProjectNGO error', err);
    res.status(500).json({ message: 'Gagal membuat proyek. Pastikan Category ID valid.' });
  }
};

// GET /api/ngo/:userId/relawan
// Menampilkan data relawan yang bergabung di proyek NGO ini
exports.getVolunteers = async (req, res) => {
  const { userId } = req.params;

  try {
    const orgId = await getOrgId(userId);

    const [volunteers] = await db.query(
      `SELECT 
         u.id,
         u.name,
         u.email,
         u.phone,
         u.city,
         p.title as project_name,
         up.hours, 
         up.status,
         up.joined_at
       FROM user_projects up
       JOIN users u ON up.user_id = u.id
       JOIN projects p ON up.project_id = p.id
       WHERE p.organization_id = ?
       ORDER BY up.joined_at DESC`,
      [orgId]
    );

    res.json(volunteers);
  } catch (err) {
    console.error('getVolunteersNGO error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// GET /api/ngo/:userId/financial
// Dashboard Keuangan (Status Pendanaan & Klaim Dana)
exports.getFinancialDashboard = async (req, res) => {
  const { userId } = req.params;

  try {
    const orgId = await getOrgId(userId);

    const [financials] = await db.query(
      `SELECT 
         id,
         title,
         target_amount,
         current_amount,
         status,
         -- Logika sederhana: jika ada dana > 0 maka bisa diklaim
         IF(current_amount > 0, 'bisa_klaim', 'belum_ada_dana') as claim_status
       FROM projects
       WHERE organization_id = ?`,
      [orgId]
    );

    res.json(financials);
  } catch (err) {
    console.error('getFinancialDashboard error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// POST /api/ngo/:userId/withdraw
// Klaim Dana (Pencatatan transaksi keluar)
exports.withdrawFund = async (req, res) => {
  const { userId } = req.params;
  const { project_id, amount, description } = req.body;

  try {
    // Di sini bisa ditambahkan validasi apakah saldo proyek mencukupi
    
    await db.query(
      `INSERT INTO wallet_transactions 
       (user_id, tx_code, tx_type, amount, description, status, created_at)
       VALUES (?, ?, 'withdraw', ?, ?, 'pending', NOW())`,
      [userId, `WD-${Date.now()}`, amount, description || `Penarikan dana proyek ${project_id}`]
    );

    res.json({ status: 'Sukses', message: 'Permintaan klaim dana berhasil diajukan.' });
  } catch (err) {
    console.error('withdrawFund error', err);
    res.status(500).json({ message: 'Gagal klaim dana.' });
  }
};