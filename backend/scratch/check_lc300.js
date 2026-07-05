const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('brand', '%Land Cruiser%');

    if (error) {
      console.error("Error fetching vehicles:", error.message);
    } else {
      console.log('--- TOYOTA LAND CRISER VEHICLES IN SUPABASE ---');
      console.log(JSON.stringify(vehicles, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
