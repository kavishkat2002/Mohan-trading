const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching settings:", error.message);
    } else {
      console.log('--- SUPABASE SETTINGS TABLE ---');
      console.log(settings);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
