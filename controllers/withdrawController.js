const db = require('../database');

// Pastikan ejaannya: exports.getPendingWithdrawals
exports.getPendingWithdrawals = async (req, res) => {
    try {
        const query = `
            SELECT 
                wt.id,
                wt.amount,
                wt.status,
                wt.created_at,
                u.name as user_name, -- Sementara ambil nama user dulu jika tabel org ribet
                wt.description
            FROM wallet_transactions wt
            JOIN users u ON wt.user_id = u.id
            WHERE wt.tx_type = 'withdraw' AND wt.status = 'pending'
            ORDER BY wt.created_at ASC
        `;
        
        const [requests] = await db.query(query);

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Pastikan ejaannya: exports.approveWithdrawal
exports.approveWithdrawal = async (req, res) => {
    const { withdrawId } = req.params;

    try {
        const query = `UPDATE wallet_transactions SET status = 'paid' WHERE id = ?`;
        const [result] = await db.query(query, [withdrawId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        res.status(200).json({
            success: true,
            message: 'Pencairan dana disetujui.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};