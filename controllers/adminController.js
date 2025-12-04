const db = require('../database');

exports.getPendingProjects = async (req, res) => {
  try {
    const query = `
      SELECT p.*, o.name AS organization_name, c.name AS category_name
      FROM projects p
      JOIN organizations o ON p.organization_id = o.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'submitted'            -- <<< BUKAN 'pending'
      ORDER BY p.created_at ASC
    `;

    const [projects] = await db.query(query);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data proyek yang menunggu verifikasi',
      data: projects,
    });
  } catch (error) {
    console.error('getPendingProjects error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.verifyProject = async (req, res) => {
  const { projectId } = req.params;
  const { action, token_reward } = req.body;

  try {
    let query = '';
    let params = [];

    if (action === 'approve') {
      // submitted -> published
      query = `
        UPDATE projects
        SET status = 'published', token_reward = ?
        WHERE id = ?
      `;
      params = [token_reward, projectId];
    } else if (action === 'reject') {
      // submitted -> rejected
      query = `
        UPDATE projects
        SET status = 'rejected'
        WHERE id = ?
      `;
      params = [projectId];
    } else {
      return res.status(400).json({ success: false, message: 'Action tidak valid (gunakan approve / reject)' });
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan' });
    }

    res.status(200).json({
      success: true,
      message: 'Proyek berhasil di-${action}',
    });
  } catch (error) {
    console.error('verifyProject error:', error);
    res.status(500).json({ success: false, message: 'Server Error'});
  }
};