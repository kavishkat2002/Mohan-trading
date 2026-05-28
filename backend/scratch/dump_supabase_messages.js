const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('messages').select('*').eq('lead_id', 10);
  if (error) {
    console.error('Supabase error:', error);
  } else {
    console.log('Supabase messages for lead 10:', data);
  }
  process.exit(0);
}

run();
