import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqfejgicasfexwsaokin.supabase.co';
const supabaseAnonKey = 'sb_publishable_MzyYM51zN2t0kNfF83TUbg_XxsfMew4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPayloads() {
  const dummyId = '00000000-0000-0000-0000-000000000000';

  console.log('--- Test 1: Full payload ---');
  const payload1 = {
    id: dummyId, user_id: dummyId, log_date: null,
    name: 'test', tag: null, type: 'normal',
    weight: 1, damage: 0, recurrence: 'none',
    status: 'missed', completion_percentage: 0,
    original_date: null, delay_count: 0,
    calendar_sync: false, time_block_enabled: false,
    has_bonus: false, is_core_discipline: false,
    importance: 'Low', urgency: 'High', priority: 'Medium',
    created_at: new Date().toISOString(),
    is_basket_task: true, is_day_only: false
  };

  const res1 = await supabase.from('tasks').upsert(payload1);
  console.log('Res 1:', res1);

  console.log('--- Test 2: Basic payload ---');
  const payload2 = {
    id: dummyId, user_id: dummyId, log_date: null,
    name: 'test', tag: null, type: 'normal',
    weight: 1, damage: 0, recurrence: 'none',
    status: 'missed', completion_percentage: 0,
    original_date: null, delay_count: 0
  };
  const res2 = await supabase.from('tasks').upsert(payload2);
  console.log('Res 2:', res2);
}

testPayloads();
