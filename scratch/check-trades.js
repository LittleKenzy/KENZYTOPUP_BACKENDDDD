const prisma = require('./src/config/db');

async function check() {
  try {
    const trades = await prisma.tradeOffer.findMany({ include: { offerer: true } });
    console.log(JSON.stringify(trades, null, 2));
  } catch (e) {
    console.log(e);
  } finally {
    process.exit(0);
  }
}
check();
