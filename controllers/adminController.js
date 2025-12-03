const db = require('../database'); // Sesuaikan path ke file database.js kamu

// 1. Ambil Semua Proyek Pending (Dashboard)
exports.getPendingProjects = async (req, res) => {
    try {
        // Kita join dengan tabel organizations agar tahu nama NGO pengaju
        const query = `
            SELECT p.*, o.name as organization_name, c.name as category_name
            FROM projects p
            JOIN organizations o ON p.organization_id = o.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        `;
        
        const [projects] = await db.query(query);

        res.status(200).json({
            success: true,
            message: 'Berhasil mengambil data proyek pending',
            data: projects
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// 2. Verifikasi Proyek (Terima/Tolak)
exports.verifyProject = async (req, res) => {
    const { projectId } = req.params;
    const { action, token_reward } = req.body; 
    // action: 'approve' atau 'reject'
    // token_reward: number (hanya diisi jika approve)

    try {
        let query = '';
        let params = [];

        if (action === 'approve') {
            // Jika diterima, ubah status jadi 'active' dan set token_reward
            query = `UPDATE projects SET status = 'active', token_reward = ? WHERE id = ?`;
            params = [token_reward, projectId];
        } else if (action === 'reject') {
            // Jika ditolak, ubah status jadi 'rejected'
            query = `UPDATE projects SET status = 'rejected' WHERE id = ?`;
            params = [projectId];
        } else {
            return res.status(400).json({ success: false, message: 'Action tidak valid' });
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan' });
        }

        res.status(200).json({
            success: true,
            message: `Proyek berhasil di-${action}`,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};