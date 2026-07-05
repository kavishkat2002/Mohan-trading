const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: leads, error } = await supabase.from('leads').select('id, name, phone');
  if (error) {
    console.error('Supabase error:', error);
  } else {
    console.log('All Supabase leads:', leads);
  }
  process.exit(0);
}

run();
