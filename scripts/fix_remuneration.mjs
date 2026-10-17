// One-time script to reset pending remuneration for ishaanpandit27@gmail.com
// for all dates strictly before 2026-10-12
// Uses the Supabase REST API directly via fetch (avoids realtime/websocket issues on Node 20)

const SUPABASE_URL = 'https://gqfejgicasfexwsaokin.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MzyYM51zN2t0kNfF83TUbg_XxsfMew4';

const TARGET_EMAIL = 'ishaanpandit27@gmail.com';
const CUTOFF_DATE = '2026-10-12'; // exclusive — reset everything BEFORE this date

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation',
};

async function restGet(table, params) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`GET ${table} failed: ${await res.text()}`);
  return res.json();
}

async function restPatch(table, params, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table} failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  // Step 1: Find user profile by email
  // First, list all profiles to debug (in case email format differs)
  const allProfiles = await restGet('profiles', {
    select: 'id,email,full_name',
    order: 'created_at.desc',
    limit: '20',
  });
  console.log('All profiles found:', JSON.stringify(allProfiles, null, 2));

  const profiles = allProfiles.filter(p => 
    p.email?.toLowerCase() === TARGET_EMAIL.toLowerCase()
  );

  if (!profiles || profiles.length === 0) {
    console.error('No profile found for:', TARGET_EMAIL);
    process.exit(1);
  }

  const profile = profiles[0];
  const userId = profile.id;
  console.log(`Found user: ${profile.full_name || profile.email} (id: ${userId})`);

  // Step 2: Fetch all earnings rows before the cutoff date for this user
  const rows = await restGet('earnings', {
    user_id: `eq.${userId}`,
    date: `lt.${CUTOFF_DATE}`,
    select: 'date,r_calc,claimed,amount_received',
    order: 'date.asc',
  });

  console.log(`\nFound ${rows.length} earnings rows before ${CUTOFF_DATE}:`);
  rows.forEach(r => {
    const pending = (r.r_calc || 0) - (r.amount_received || 0);
    console.log(`  ${r.date}: r_calc=${r.r_calc}, received=${r.amount_received}, pending=${pending.toFixed(2)}, claimed=${r.claimed}`);
  });

  const toUpdate = rows.filter(r => Math.abs((r.r_calc || 0) - (r.amount_received || 0)) > 0.01);

  if (toUpdate.length === 0) {
    console.log('\nNo rows with pending balance found before cutoff. Nothing to do.');
    return;
  }

  console.log(`\nWill reset ${toUpdate.length} rows...`);

  // Step 3: Update each row individually (PATCH with date+user_id filter)
  for (const r of toUpdate) {
    await restPatch('earnings', {
      user_id: `eq.${userId}`,
      date: `eq.${r.date}`,
    }, {
      claimed: true,
      amount_received: r.r_calc || 0,
    });
    console.log(`  ✓ Reset ${r.date}: amount_received set to ${r.r_calc}`);
  }

  console.log('\n✓ All done! Pending remuneration before', CUTOFF_DATE, 'has been cleared.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
