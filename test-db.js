const { PrismaClient } = require('@prisma/client');

// Test with explicit URL to rule out env issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn', 'info']
});

async function main() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'NOT SET');
    console.log('');
    console.log('Attempting connection...');
    await prisma.$connect();
    console.log('SUCCESS! Connected to database.');
    
    const result = await prisma.$queryRaw`SELECT current_database() as db, current_user as usr`;
    console.log('Database info:', JSON.stringify(result));
  } catch (error) {
    console.error('FAILED!');
    console.error('Message:', error.message);
    console.error('');
    console.error('Full error:');
    console.error(JSON.stringify({
      name: error.name,
      code: error.errorCode,
      clientVersion: error.clientVersion,
      meta: error.meta
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
