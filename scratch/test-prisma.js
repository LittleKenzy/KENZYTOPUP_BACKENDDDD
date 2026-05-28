require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function test() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:]+@/, ':***@'));
  const p = new PrismaClient();
  try {
    await p.$connect();
    console.log('PRISMA CONNECT OK');
    const count = await p.user.count();
    console.log('Users:', count);
  } catch (e) {
    console.log('PRISMA ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

test();
