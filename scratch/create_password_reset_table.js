// Script untuk membuat tabel PasswordResetToken secara manual
// via pooled connection (DATABASE_URL, port 6543)

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Cek apakah tabel sudah ada
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'PasswordResetToken'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ Tabel PasswordResetToken sudah ada!');
      return;
    }

    // Buat tabel PasswordResetToken
    await prisma.$executeRaw`
      CREATE TABLE "PasswordResetToken" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "isUsed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") 
          REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    // Buat unique index pada kolom token
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
    `;

    console.log('✅ Tabel PasswordResetToken berhasil dibuat!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
