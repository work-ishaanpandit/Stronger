require('dotenv').config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDelete() {
  const testId = '00000000-0000-0000-0000-000000000000';
  const userId = '00000000-0000-0000-0000-000000000001'; // Mock user

  console.log('Inserting test task...');
  let { error: insertErr } = await supabase.from('tasks').upsert({
    id: testId,
    user_id: userId,
    log_date: '2026-07-09',
    name: 'Delete Test',
    type: 'normal'
  });
  
  if (insertErr) {
    console.error('Insert failed:', insertErr);
    return;
  }
  
  console.log('Deleting test task...');
  let { error: deleteErr } = await supabase.from('tasks').delete().eq('id', testId);
  
  if (deleteErr) {
    console.error('Delete failed:', deleteErr);
  } else {
    console.log('Delete succeeded!');
  }
}

testDelete();
