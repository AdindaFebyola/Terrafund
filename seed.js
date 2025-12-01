require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Mencoba menghubungkan ke MySQL...');
    console.log('🔄 Reset tabel (HATI-HATI: data lama dihapus)...');

    // Matikan cek foreign key sementara agar bisa truncate tabel tanpa urutan
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Hapus data lama dari semua tabel terkait
    await db.query('TRUNCATE TABLE wallet_transactions');
    await db.query('TRUNCATE TABLE donations');
    await db.query('TRUNCATE TABLE user_projects'); // Asumsi ada tabel relasi user-project (relawan)
    await db.query('TRUNCATE TABLE projects');
    await db.query('TRUNCATE TABLE organizations'); // Pastikan tabel organizations ada
    await db.query('TRUNCATE TABLE categories');
    await db.query('TRUNCATE TABLE users');
    
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Tabel di-reset. Mulai insert data...');

    // 1. Insert Organizations (NGO)
    // ID organisasi akan otomatis 1, 2, 3 karena auto increment di-reset truncate
    await db.query(`
      INSERT INTO organizations (name, logo, description, created_at, updated_at) VALUES
      ('Green Earth Foundation', '/images/org/green-earth.png', 'Organisasi lingkungan yang fokus pada reboisasi dan konservasi.', NOW(), NOW()),
      ('Water for Life', '/images/org/water-for-life.png', 'Lembaga yang menyediakan akses air bersih untuk desa-desa terpencil.', NOW(), NOW()),
      ('Education Hub', '/images/org/education-hub.png', 'Organisasi yang mendukung pendidikan dan literasi anak.', NOW(), NOW())
    `);
    console.log('✅ Organizations inserted.');

    // 2. Insert Categories
    await db.query(`
      INSERT INTO categories (name, icon, created_at, updated_at) VALUES
      ('Lingkungan', '🌱', NOW(), NOW()),
      ('Kemanusiaan', '🤝', NOW(), NOW()),
      ('Pendidikan', '📚', NOW(), NOW()),
      ('Air Bersih', '💧', NOW(), NOW())
    `);
    console.log('✅ Categories inserted.');

    // 3. Insert Users
    const passwordHash = await bcrypt.hash('password123', 10);

    // ID User akan otomatis 1, 2, 3
    await db.query(`
      INSERT INTO users (name, email, password_hash, wallet_address, role, level, xp, created_at, updated_at) VALUES
      (
        'Wiliiam Xavierus',
        'wilxav@gmail.com',
        '${passwordHash}',
        '0x92ce9d53356860e8004ff527a414b82b810bd7fd',
        'relawan',
        7,
        3200,
        NOW(),
        NOW()
      ),
      (
        'Donatur Satu',
        'donatur1@gmail.com',
        '${passwordHash}',
        '0x1111111111111111111111111111111111111111',
        'donatur',
        1,
        0,
        NOW(),
        NOW()
      ),
      (
        'NGO Owner (Green Earth)',
        'ngo@gmail.com',
        '${passwordHash}',
        NULL,
        'ngo',
        1,
        0,
        NOW(),
        NOW()
      )
    `);
    console.log('✅ Users inserted.');

    // 4. Insert Projects
    // organization_id: 1 (Green Earth), 2 (Water for Life), 3 (Education Hub)
    // category_id: 1 (Lingkungan), 2 (Kemanusiaan), 3 (Pendidikan), 4 (Air Bersih)
    await db.query(`
      INSERT INTO projects (
        title, slug, organization_id, category_id, description,
        location, duration_months, target_amount, current_amount,
        donor_count, thumbnail, banner_image, start_date, end_date, created_at, updated_at
      ) VALUES
      (
        'Reboisasi Hutan Kalimantan',
        'reboisasi-hutan-kalimantan',
        1, -- Milik Green Earth Foundation
        1, -- Kategori Lingkungan
        'Program reboisasi untuk menanam 100.000 pohon di area hutan Kalimantan yang mengalami deforestasi.',
        'Kalimantan Timur, Indonesia',
        12,
        100000000,
        65000000,
        234,
        '/images/projects/reboisasi-thumb.png',
        '/images/projects/reboisasi-banner.png',
        '2025-01-01',
        '2025-12-31',
        NOW(), NOW()
      ),
      (
        'Air Bersih untuk Desa',
        'air-bersih-untuk-desa',
        2, -- Milik Water for Life
        4, -- Kategori Air Bersih
        'Menyediakan akses air bersih dan sanitasi untuk desa terpencil.',
        'NTT, Indonesia',
        8,
        50000000,
        21000000,
        120,
        '/images/projects/air-bersih-thumb.png',
        '/images/projects/air-bersih-banner.png',
        '2025-02-01',
        '2025-10-01',
        NOW(), NOW()
      ),
      (
        'Perpustakaan Digital Anak',
        'perpustakaan-digital-anak',
        3, -- Milik Education Hub
        3, -- Kategori Pendidikan
        'Membangun perpustakaan digital untuk meningkatkan literasi anak-anak.',
        'Jakarta, Indonesia',
        6,
        50000000,
        40000000,
        180,
        '/images/projects/perpus-thumb.png',
        '/images/projects/perpus-banner.png',
        '2025-03-01',
        '2025-09-01',
        NOW(), NOW()
      ),
      (
        'Bank Sampah Komunitas',
        'bank-sampah-komunitas',
        1, -- Milik Green Earth Foundation (Lagi)
        1, -- Kategori Lingkungan
        'Mengelola sampah plastik menjadi barang bernilai ekonomi.',
        'Surabaya, Indonesia',
        6,
        15000000,
        12000000,
        85,
        '/images/projects/sampah-thumb.png',
        '/images/projects/sampah-banner.png',
        '2025-04-01',
        '2025-10-01',
        NOW(), NOW()
      )
    `);
    console.log('✅ Projects inserted.');

    // 5. Insert Wallet Transactions
    await db.query(`
      INSERT INTO wallet_transactions 
        (user_id, tx_code, tx_type, amount, description, status, created_at)
      VALUES
        -- Donatur (ID 2): donasi & reward
        (2, 'TX42121', 'donation', 500000, 'Donasi ke Reboisasi Hutan Kalimantan', 'paid', '2025-01-12 00:00:00'),
        (2, 'TX42111', 'reward',   350,    'Reward: Donasi Rp 500.000',          'paid', '2025-01-10 00:00:00'),

        -- Relawan (ID 1): reward dari misi
        (1, 'TX40001', 'reward',   100,    'Reward: Penanaman Pohon Mangrove',  'paid', '2024-11-18 00:00:00'),
        (1, 'TX40002', 'reward',    75,    'Reward: Bersih-bersih Pantai',      'paid', '2024-11-16 00:00:00')
    `);
    console.log('✅ Wallet transactions inserted.');

    // 6. Insert Donations
    await db.query(`
      INSERT INTO donations (
        project_id,
        user_id,
        amount,
        order_id,
        payment_method,
        payment_status,
        blockchain_tx_hash,
        created_at,
        updated_at
      ) VALUES
        (1, 2, 500000, 'ORDER-SEED-001', 'midtrans', 'paid', NULL, '2025-01-12 00:00:00', '2025-01-12 00:00:00'),
        (2, 2, 210000, 'ORDER-SEED-002', 'midtrans', 'paid', NULL, '2025-01-15 00:00:00', '2025-01-15 00:00:00')
    `);
    console.log('✅ Donations inserted.');

    // 7. Insert User Projects (Relawan yang join proyek - opsional)
    // Asumsi ada tabel user_projects untuk melacak relawan di proyek mana
    // Kolom: user_id, project_id, status, hours, joined_at
    // Pastikan tabel user_projects ada di database kamu. Jika belum, buat dulu atau skip bagian ini.
    
    // Cek dulu apakah tabel user_projects ada agar tidak error jika belum dibuat
    const [tables] = await db.query("SHOW TABLES LIKE 'user_projects'");
    if (tables.length > 0) {
        await db.query(`
          INSERT INTO user_projects (user_id, project_id, status, hours, joined_at) VALUES
          (1, 1, 'active', 12, '2025-01-05 10:00:00'), -- Relawan 1 join Proyek 1
          (1, 4, 'completed', 5, '2025-02-01 09:00:00') -- Relawan 1 join Proyek 4
        `);
        console.log('✅ User projects (relawan) inserted.');
    } else {
        console.log('⚠️ Tabel user_projects tidak ditemukan, skipping insert relawan projects.');
    }

    console.log('🎉 Seeder selesai! Semua data awal berhasil dimasukkan.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder error:', err);
    process.exit(1);
  }
}

seed();