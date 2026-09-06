import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqfejgicasfexwsaokin.supabase.co';
const supabaseAnonKey = 'sb_publishable_MzyYM51zN2t0kNfF83TUbg_XxsfMew4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALL_TASK_COLUMNS = [
  'id', 'user_id', 'log_date', 'name', 'tag', 'type', 'weight', 'damage',
  'recurrence', 'status', 'completion_percentage', 'has_bonus', 'original_date',
  'delay_count', 'gcal_event_id', 'time_block_enabled', 'time_block_start',
  'time_block_end', 'audit_notes', 'postponed_to_date', 'deadline',
  'importance', 'urgency', 'priority', 'estimated_duration', 'notes',
  'created_at', 'completed_at', 'planned_date', 'committed_percentage',
  'activity_log', 'is_basket_task', 'is_day_only'
];

async function testColumns() {
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const existingCols = [];
  const missingCols = [];

  for (const col of ALL_TASK_COLUMNS) {
    const payload = { id: dummyId, user_id: dummyId, [col]: null };
    const { error } = await supabase.from('tasks').upsert(payload);
    
    if (error && error.code === 'PGRST204' && error.message?.includes("Could not find")) {
      missingCols.push(col);
    } else {
      existingCols.push(col);
    }
  }

  console.log('EXISTING COLUMNS IN DB:', existingCols);
  console.log('MISSING COLUMNS IN DB:', missingCols);
}

testColumns();
