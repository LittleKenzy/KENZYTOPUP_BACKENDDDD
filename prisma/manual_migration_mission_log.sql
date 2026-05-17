-- ============================================
-- Migration: Create MissionLog table
-- Jalankan ini di Supabase Dashboard > SQL Editor
-- ============================================

-- Buat tabel MissionLog
CREATE TABLE IF NOT EXISTS "MissionLog" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"      TEXT NOT NULL,
    "missionDate" TEXT NOT NULL,
    "channel"     TEXT NOT NULL,
    "points"      INTEGER NOT NULL DEFAULT 10,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionLog_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: 1x per hari per user
CREATE UNIQUE INDEX IF NOT EXISTS "MissionLog_userId_missionDate_key" 
ON "MissionLog"("userId", "missionDate");

-- Foreign key ke tabel User
ALTER TABLE "MissionLog" 
ADD CONSTRAINT "MissionLog_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Verifikasi
SELECT 'MissionLog table created successfully!' AS status;
