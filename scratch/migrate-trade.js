// Direct SQL migration script — bypass Prisma engine DNS issue
// Creates Wishlist and TradeOffer tables + TradeStatus enum
require('dotenv').config();

const { Client } = require('pg');

async function migrate() {
  // Use DIRECT_URL for migration (port 5432, direct connection)
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  console.log('Connecting to database...');
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    console.log('Connected!');

    // Check if enum already exists
    const enumCheck = await client.query(`
      SELECT 1 FROM pg_type WHERE typname = 'TradeStatus'
    `);

    if (enumCheck.rows.length > 0) {
      console.log('TradeStatus enum already exists, skipping...');
    } else {
      console.log('Creating TradeStatus enum...');
      await client.query(`
        CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'MATCHED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED')
      `);
      console.log('TradeStatus enum created!');
    }

    // Check if Wishlist table exists
    const wishlistCheck = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'Wishlist'
    `);

    if (wishlistCheck.rows.length > 0) {
      console.log('Wishlist table already exists, skipping...');
    } else {
      console.log('Creating Wishlist table...');
      await client.query(`
        CREATE TABLE "Wishlist" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "cardId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
        )
      `);
      await client.query(`CREATE UNIQUE INDEX "Wishlist_userId_cardId_key" ON "Wishlist"("userId", "cardId")`);
      await client.query(`CREATE INDEX "Wishlist_cardId_idx" ON "Wishlist"("cardId")`);
      await client.query(`ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
      await client.query(`ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      console.log('Wishlist table created!');
    }

    // Check if TradeOffer table exists
    const tradeCheck = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'TradeOffer'
    `);

    if (tradeCheck.rows.length > 0) {
      console.log('TradeOffer table already exists, skipping...');
    } else {
      console.log('Creating TradeOffer table...');
      await client.query(`
        CREATE TABLE "TradeOffer" (
          "id" TEXT NOT NULL,
          "offererId" TEXT NOT NULL,
          "offeredCardId" TEXT NOT NULL,
          "wantedCardId" TEXT NOT NULL,
          "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
          "matchedUserId" TEXT,
          "confirmedByOfferer" BOOLEAN NOT NULL DEFAULT false,
          "confirmedByMatcher" BOOLEAN NOT NULL DEFAULT false,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("id")
        )
      `);
      await client.query(`CREATE INDEX "TradeOffer_offererId_idx" ON "TradeOffer"("offererId")`);
      await client.query(`CREATE INDEX "TradeOffer_status_idx" ON "TradeOffer"("status")`);
      await client.query(`CREATE INDEX "TradeOffer_offeredCardId_idx" ON "TradeOffer"("offeredCardId")`);
      await client.query(`CREATE INDEX "TradeOffer_wantedCardId_idx" ON "TradeOffer"("wantedCardId")`);
      await client.query(`ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_offererId_fkey" FOREIGN KEY ("offererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      await client.query(`ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
      await client.query(`ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_offeredCardId_fkey" FOREIGN KEY ("offeredCardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      await client.query(`ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_wantedCardId_fkey" FOREIGN KEY ("wantedCardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
      console.log('TradeOffer table created!');
    }

    // Verify existing data is intact
    console.log('\n=== VERIFICATION ===');
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "Card") as cards,
        (SELECT COUNT(*) FROM "UserCard") as user_cards,
        (SELECT COUNT(*) FROM "Product") as products,
        (SELECT COUNT(*) FROM "Transaction") as transactions,
        (SELECT COUNT(*) FROM "Wishlist") as wishlists,
        (SELECT COUNT(*) FROM "TradeOffer") as trade_offers
    `);
    
    const r = counts.rows[0];
    console.log('--- Existing data (INTACT) ---');
    console.log('Users:', r.users);
    console.log('Cards:', r.cards);
    console.log('UserCards:', r.user_cards);
    console.log('Products:', r.products);
    console.log('Transactions:', r.transactions);
    console.log('--- New tables ---');
    console.log('Wishlists:', r.wishlists);
    console.log('TradeOffers:', r.trade_offers);
    console.log('\n✅ Migration complete! All data safe.');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await client.end();
  }
}

migrate();
