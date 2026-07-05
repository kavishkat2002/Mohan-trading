const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://nceyweiskamspdxfxnga.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: vehicles, error: vErr } = await supabase
    .from('vehicles')
    .select('id, brand, price');

  if (vErr) {
    console.error("Error fetching vehicles:", vErr.message);
  } else {
    console.log(`Vehicles count in Supabase: ${vehicles.length}`);
    console.log(vehicles.slice(0, 3));
  }

  const { data, error } = await supabase
    .from('leads')
    .select('notes')
    .eq('phone', 'SYSTEM_SETTINGS')
    .maybeSingle();

  if (error) {
    console.error("Error fetching settings:", error.message);
  } else {
    console.log("SYSTEM_SETTINGS row in Supabase:");
    console.log(data);
    if (data && data.notes) {
      try {
        console.log("Parsed settings notes content:");
        console.log(JSON.parse(data.notes));
      } catch (e) {
        console.error("Failed to parse notes JSON:", e.message);
      }
    }
  }
}

check();
