const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, leads(phone, name)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Supabase error:', error);
  } else {
    console.log('Latest messages on Supabase with lead info:', messages);
  }
  process.exit(0);
}

run();
