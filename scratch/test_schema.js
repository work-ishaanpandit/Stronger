require('dotenv').config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://gqfejgicasfexwsaokin.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const tables = ['tasks', 'daily_logs', 'core_disciplines', 'earnings'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table '${table}' exists and is accessible. Fields returned:`);
      if (data.length > 0) {
         console.log(Object.keys(data[0]));
      } else {
         console.log(`[Table is empty, schema check passed without rows]`);
      }
    }
  }
}

checkSchema();
