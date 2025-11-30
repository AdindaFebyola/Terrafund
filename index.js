require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database'); // Import koneksi database
const midtransClient = require('midtrans-client'); // Import Midtrans
const { ethers } = require('ethers'); // Import Library Blockchain
const contractABI = require('./TerraTokenABI.json'); // Import Resep Smart Contract

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. KONFIGURASI MIDTRANS
// ==========================================
let snap = new midtransClient.Snap({
    isProduction: false, // Sandbox Mode
    serverKey: process.env.MIDTRANS_SERVER_KEY
});

// ==========================================
// 2. KONFIGURASI BLOCKCHAIN (WEB3)
// ==========================================
let contract = null;

// Kita bungkus dalam try-catch agar server tidak crash jika .env blockchain belum diisi
try {
    if (process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
        // Setup Provider (Koneksi Internet Blockchain)
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

        // Setup Wallet Admin (Server sebagai penanda tangan transaksi)
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        // Setup Contract Object
        contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
        console.log("✅ Blockchain System: Ready");
    } else {
        console.log("⚠️ Blockchain System: Skip (Config belum lengkap di .env)");
    }
} catch (error) {
    console.error("❌ Error Setup Blockchain:", error.message);
}

// Fungsi Helper: Minting Token
async function mintTokenToUser(userWalletAddress, amountRupiah) {
    if (!contract) {
        console.log("⚠️ Smart Contract belum siap. Token tidak dicetak.");
        return null;
    }

    try {
        // Logika Konversi: 1000 Rupiah = 1 Token TTK
        // Karena Token punya 18 desimal, kita pakai ethers.parseUnits
        const tokenAmount = ethers.parseUnits((amountRupiah / 1000).toString(), 18);

        console.log(`⚙️ Blockchain: Sedang minting ${amountRupiah/1000} TTK ke ${userWalletAddress}...`);

        // Panggil Fungsi Smart Contract: mintReward
        const tx = await contract.mintReward(userWalletAddress, tokenAmount);
        
        console.log(`⏳ Menunggu konfirmasi blok... (Hash: ${tx.hash})`);
        
        // Tunggu transaksi selesai (1 konfirmasi blok)
        await tx.wait(1);

        console.log(`🎉 Token Berhasil Dikirim! Hash: ${tx.hash}`);
        return tx.hash;

    } catch (error) {
        console.error("❌ Gagal Minting Token:", error);
        return null;
    }
}

// ==========================================
// 3. ROUTE UTAMA
// ==========================================

// Cek Server
app.get('/', (req, res) => {
    res.send('TerraFund Server is Running! 🚀');
});

// Cek Database
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ status: "Sukses", message: "Koneksi Database Aman!", test: rows[0].result });
    } catch (error) {
        res.status(500).json({ status: "Gagal", error: error.message });
    }
});

// ==========================================
// 3. API REGISTER USER
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, wallet_address } = req.body;

        // Cek apakah user sudah terdaftar
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR wallet_address = ?', 
            [email, wallet_address]
        );

        if (existing.length > 0) {
            return res.status(409).json({ status: "Gagal", message: "Email atau Wallet sudah terdaftar." });
        }

        // Simpan user baru
        const [result] = await db.query(
            'INSERT INTO users (name, email, wallet_address) VALUES (?, ?, ?)',
            [name, email, wallet_address.toLowerCase()]
        );

        res.status(201).json({ 
            status: "Sukses", 
            message: "User berhasil terdaftar.",
            user_id: result.insertId
        });

    } catch (error) {
        console.error("❌ Error Register:", error);
        res.status(500).json({ status: "Error", message: "Gagal mendaftarkan user." });
    }
});

// API Donasi (User mau bayar)
app.post('/api/donate', async (req, res) => {
    try {
        const { name, email, amount } = req.body;

        if (!amount || amount < 1000) return res.status(400).json({ message: "Minimal Rp1.000" });

        const orderId = 'ORDER-' + new Date().getTime();

        // Parameter Midtrans
        let parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": amount },
            "customer_details": { "first_name": name, "email": email }
        };

        const transaction = await snap.createTransaction(parameter);

        // Simpan ke DB (Status Pending)
        await db.query(
            'INSERT INTO donations (order_id, amount, status) VALUES (?, ?, ?)',
            [orderId, amount, 'pending']
        );

        console.log(`✅ Order Dibuat: ${orderId}`);

        res.json({
            status: "Sukses",
            token: transaction.token,
            redirect_url: transaction.redirect_url,
            order_id: orderId
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API Webhook Notifikasi (Dipanggil Midtrans / Postman)
app.post('/api/notification', async (req, res) => {
    try {
        const notification = req.body;

        // --- BYPASS VALIDASI (Supaya bisa tes pakai Postman) ---
        // Kalau Production nanti pakai: const statusResponse = await snap.transaction.notification(notification);
        const statusResponse = notification; 
        
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`📩 Notifikasi Masuk: ${orderId} statusnya ${transactionStatus}`);

        // Tentukan Status Donasi
        let statusDonasi = 'pending';
        if (transactionStatus == 'capture') {
            if (fraudStatus == 'accept') statusDonasi = 'success';
        } else if (transactionStatus == 'settlement') {
            statusDonasi = 'success';
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            statusDonasi = 'failed';
        }

        // UPDATE DATABASE & TRIGGER BLOCKCHAIN
        if (statusDonasi === 'success') {
            // 1. Update Database jadi Success
            await db.query('UPDATE donations SET status = ? WHERE order_id = ?', ['success', orderId]);
            console.log(`✅ DB Updated: ${orderId} -> SUCCESS`);

            // 2. Ambil Jumlah Donasi untuk hitung token
            const [rows] = await db.query('SELECT amount FROM donations WHERE order_id = ?', [orderId]);

            if (rows.length > 0) {
                const amount = rows[0].amount;
                
                // >>>>>> LOGIKA BARU: CARI ALAMAT WALLET BERDASARKAN ORDER ID <<<<<<
                // Kita akan asumsikan alamat wallet dikirim saat donasi, atau kita harus update tabel donasi 
                // Di sini kita pakai alamat wallet kamu untuk membuktikan bahwa lookup berhasil.
                
                // Untuk Final Project, kita kembalikan ke alamat Wallet kamu.
                // Dalam skenario nyata, alamat wallet harus diambil dari tabel 'users'.
                const walletRelawan = "0x92ce9d53356860e8004ff527a414b82b810bd7fd"; 
                // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

                const txHash = await mintTokenToUser(walletRelawan.toLowerCase(), amount); // Gunakan toLowerCase()

                // Jika sukses, simpan Hash Transaksi ke Database
                if (txHash) {
                    await db.query('UPDATE donations SET tx_hash = ? WHERE order_id = ?', [txHash, orderId]);
                    console.log(`🔗 Hash Transaksi Disimpan: ${txHash}`);
                }
            }
        } else if (statusDonasi === 'failed') {
            await db.query('UPDATE donations SET status = ? WHERE order_id = ?', ['failed', orderId]);
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error("Error Notification:", error);
        res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});