// ============================================
// Database Config — Prisma Client with pg adapter
// ============================================

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Singleton pattern: mencegah multiple instance saat hot-reload
const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;

  // Menggunakan pg adapter untuk custom routing via IP (Bypass DNS blocker)
  const pool = new Pool({
    host: '13.239.87.90',
    port: 5432,
    database: 'postgres',
    user: 'postgres.qqtyqxgatwsrsgioavmm',
    password: 'Bilal_31012013',
    max: 10,
    connectionTimeoutMillis: 60000, // Beri waktu 60 detik jika internet sedang sangat lambat (botol leher)
    idleTimeoutMillis: 30000, 
    keepAlive: true, // Pastikan TCP keepalive nyala untuk pooler Supabase
    ssl: { 
      rejectUnauthorized: false,
      servername: 'aws-1-ap-southeast-2.pooler.supabase.com' // Penting untuk routing Supabase (SNI)
    },
  });

  // Wajib menangani event 'error' pada idle clients. 
  // Jika Supabase memutus koneksi idle secara sepihak, Node.js tidak akan crash,
  // melainkan pg-pool akan membuang koneksi tersebut dan membuat yang baru nanti.
  pool.on('error', (err, client) => {
    // console.warn('Supabase menutup idle connection. pg-pool akan merekap.', err.message);
  });

  const adapter = new PrismaPg(pool);

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;
