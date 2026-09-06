import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqfejgicasfexwsaokin.supabase.co';
const supabaseAnonKey = 'sb_publishable_MzyYM51zN2t0kNfF83TUbg_XxsfMew4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  console.log('Testing connection to Supabase tasks table...');
  const { data, error } = await supabase.from('tasks').select('*').limit(5);
  if (error) {
    console.error('Select error:', error);
    return;
  }
  console.log('Fetched rows:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('Sample task keys from DB:', Object.keys(data[0]));
    console.log('Sample task data:', data[0]);
  }
}

testQuery();
