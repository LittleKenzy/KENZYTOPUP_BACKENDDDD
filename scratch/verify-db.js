// Verify tables via Supabase REST API (HTTPS, not direct PG)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function verify() {
  console.log('=== DATABASE TABLE VERIFICATION ===\n');

  // Check existing tables
  const tables = [
    { name: 'User', label: 'Users (existing)' },
    { name: 'Card', label: 'Cards (existing)' },
    { name: 'UserCard', label: 'UserCards (existing)' },
    { name: 'Product', label: 'Products (existing)' },
    { name: 'Transaction', label: 'Transactions (existing)' },
    { name: 'Wishlist', label: 'Wishlists (NEW)' },
    { name: 'TradeOffer', label: 'TradeOffers (NEW)' },
  ];

  for (const t of tables) {
    const { data, error, count } = await supabase
      .from(t.name)
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${t.label}: ERROR - ${error.message}`);
    } else {
      console.log(`✅ ${t.label}: ${count} rows`);
    }
  }

  console.log('\n=== DONE ===');
}

verify();
