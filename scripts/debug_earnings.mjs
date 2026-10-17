// Debug: list distinct user_ids in earnings table
// to find which user_id belongs to ishaanpandit27@gmail.com

const SUPABASE_URL = 'https://gqfejgicasfexwsaokin.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MzyYM51zN2t0kNfF83TUbg_XxsfMew4';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

async function main() {
  // The anon key hits RLS — we can only see what the policy allows.
  // Let's check the earnings table for recent dates to understand the data.
  const url = new URL(`${SUPABASE_URL}/rest/v1/earnings`);
  url.searchParams.append('select', 'user_id,date,r_calc,claimed,amount_received');
  url.searchParams.append('date', 'gte.2026-10-01');
  url.searchParams.append('order', 'date.desc');
  url.searchParams.append('limit', '30');

  const res = await fetch(url.toString(), { headers });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

main().catch(console.error);
