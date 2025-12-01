const express = require('express');
const cors = require('cors');
const db = require('./database');
const midtransClient = require('midtrans-client');
const { ethers } = require('ethers');
const contractABI = require('./TerraTokenABI.json');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors());
app.use(express.json());

let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

let contract = null;

try {
  if (process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
    console.log('✅ Blockchain System: Ready');
  } else {
    console.log('⚠️ Blockchain System: Skip (Config belum lengkap di .env)');
  }
} catch (error) {
  console.error('❌ Error Setup Blockchain:', error.message);
}

async function mintTokenToUser(userWalletAddress, amountRupiah) {
  if (!contract) {
    console.log('⚠️ Smart Contract belum siap. Token tidak dicetak.');
    return null;
  }

  try {
    const tokenAmount = ethers.parseUnits((amountRupiah / 1000).toString(), 18);

    console.log(`⚙️ Blockchain: Sedang minting ${amountRupiah / 1000} TTK ke ${userWalletAddress}...`);

    const tx = await contract.mintReward(userWalletAddress, tokenAmount);

    console.log(`⏳ Menunggu konfirmasi blok... (Hash: ${tx.hash})`);

    await tx.wait(1);

    console.log(`🎉 Token Berhasil Dikirim! Hash: ${tx.hash}`);
    return tx.hash;
  } catch (error) {
    console.error('❌ Gagal Minting Token:', error);
    return null;
  }
}

app.get('/', (req, res) => {
  res.send('TerraFund Server is Running! 🚀');
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ status: 'Sukses', message: 'Koneksi Database Aman!', test: rows[0].result });
  } catch (error) {
    res.status(500).json({ status: 'Gagal', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({
        status: 'Gagal',
        message: 'name, email, password, phone, dan role wajib diisi.',
      });
    }

    const allowedRoles = ['donatur', 'relawan', 'ngo'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ status: 'Gagal', message: 'Role tidak valid.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'Gagal', message: 'Email sudah terdaftar.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    let wallet_address = null;
    if (role === 'relawan' || role === 'donatur') {
      const wallet = ethers.Wallet.createRandom();
      wallet_address = wallet.address.toLowerCase();
      console.log('🔑 Wallet baru untuk', role, email);
      console.log('Address :', wallet_address);
      console.log('PrivKey :', wallet.privateKey); // buat demo/metamask (jangan di-production)
    }

    const [result] = await db.query(
      `INSERT INTO users 
         (name, email, password_hash, wallet_address, phone, role, level, xp, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, email, password_hash, wallet_address, phone, role, 1, 0]
    );

    res.status(201).json({
      status: 'Sukses',
      message: 'User berhasil terdaftar.',
      user_id: result.insertId,
      role,
      wallet_address,
    });
  } catch (error) {
    console.error('❌ Error Register:', error);
    res.status(500).json({ status: 'Error', message: 'Gagal mendaftarkan user.' });
  }
});

app.post('/api/donate', async (req, res) => {
  try {
    const { user_id, project_id, name, email, amount } = req.body;

    if (!user_id || !project_id) {
      return res.status(400).json({ message: 'user_id dan project_id wajib diisi.' });
    }

    if (!amount || amount < 1000) {
      return res.status(400).json({ message: 'Minimal Rp1.000' });
    }

    const orderId = 'ORDER-' + Date.now();

    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { first_name: name, email },
    };

    const transaction = await snap.createTransaction(parameter);

    await db.query(
      `INSERT INTO donations (
         project_id,
         user_id,
         amount,
         order_id,
         payment_method,
         payment_status,
         blockchain_tx_hash,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [project_id, user_id, amount, orderId, 'midtrans', 'pending', null]
    );

    res.json({
      status: 'Sukses',
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
    });
  } catch (error) {
    console.error('Error /api/donate:', error);
    res.status(500).json({ message: 'Gagal membuat donasi.' });
  }
});

app.post('/api/notification', async (req, res) => {
  try {
    const notification = req.body;
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let paymentStatus = 'pending';

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') paymentStatus = 'paid';
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'paid';
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      paymentStatus = 'failed';
    }

    await db.query('UPDATE donations SET payment_status = ?, updated_at = NOW() WHERE order_id = ?', [paymentStatus, orderId]);

    if (paymentStatus === 'paid') {
      const [[donation]] = await db.query(
        `SELECT 
           d.id,
           d.user_id,
           d.amount,
           d.blockchain_tx_hash,
           u.wallet_address
         FROM donations d
         JOIN users u ON d.user_id = u.id
         WHERE d.order_id = ?`,
        [orderId]
      );

      if (donation) {
        if (donation.blockchain_tx_hash) {
          console.log(`Token sudah pernah dikirim untuk order ${orderId}, skip minting.`);
        } else if (!donation.wallet_address) {
          console.warn(`Wallet address belum ada untuk user ${donation.user_id}, skip minting.`);
        } else {
          const txHash = await mintTokenToUser(donation.wallet_address, donation.amount);
          if (txHash) {
            await db.query('UPDATE donations SET blockchain_tx_hash = ?, updated_at = NOW() WHERE id = ?', [txHash, donation.id]);

            const ttkAmount = Math.floor(donation.amount / 1000); // konversi rupiah -> TTK
            await db.query(
              `INSERT INTO wallet_transactions (user_id, tx_code, tx_type, amount, description, status, created_at)
               VALUES (?, ?, 'reward', ?, ?, 'paid', NOW())`,
              [donation.user_id, orderId, ttkAmount, 'Reward donasi']
            );
            console.log(`Reward on-chain dikirim. Hash: ${txHash}`);
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error Notification:', error);
    res.status(500).send('Error');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'Gagal', message: 'Email dan password wajib diisi.' });
    }

    const [rows] = await db.query(
      `SELECT 
         id,
         name,
         email,
         password_hash,
         role,
         phone,
         wallet_address,
         level,
         xp
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ status: 'Gagal', message: 'Email atau password salah.' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'Gagal', message: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      status: 'Sukses',
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        wallet_address: user.wallet_address,
        level: user.level,
        xp: user.xp,
      },
    });
  } catch (error) {
    console.error('Gagal Login:', error);
    res.status(500).json({ status: 'Error', message: 'Gagal login.' });
  }
});

const projectRoutes = require('./routes/project.routes');
app.use('/api/projects', projectRoutes);

const relawanRoutes = require('./routes/relawan.routes');
app.use('/api/relawan', relawanRoutes);

const donaturRoutes = require('./routes/donatur.routes');
app.use('/api/donatur', donaturRoutes);

const ngoRoutes = require('./routes/ngo.routes');
app.use('/api/ngo', ngoRoutes);
module.exports = app;