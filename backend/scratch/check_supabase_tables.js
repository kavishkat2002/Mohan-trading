const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Let's try querying settings table
  const { data: settingsData, error: settingsError } = await supabase.from('settings').select('*');
  console.log('Querying public.settings:', { settingsData, settingsError });

  // Let's try querying businesses table
  const { data: busData, error: busError } = await supabase.from('businesses').select('*');
  console.log('Querying public.businesses:', { busData, busError });

  process.exit(0);
}

run();
