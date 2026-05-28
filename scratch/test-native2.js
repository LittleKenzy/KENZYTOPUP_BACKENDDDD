const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.qqtyqxgatwsrsgioavmm:Bilal_31012013@13.239.87.90:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs"
    }
  }
});
prisma.user.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
