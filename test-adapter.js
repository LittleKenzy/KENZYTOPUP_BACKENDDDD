const prisma = require('./src/config/db');

async function test() {
  try {
    console.log('Connecting using adapter...');
    await prisma.$connect();
    console.log('PRISMA ADAPTER CONNECT OK');
    const count = await prisma.user.count();
    console.log('Users:', count);
  } catch (e) {
    console.log('PRISMA ADAPTER ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
