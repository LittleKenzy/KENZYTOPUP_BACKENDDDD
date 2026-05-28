const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.qqtyqxgatwsrsgioavmm:Bilal_31012013@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});
prisma.user.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
