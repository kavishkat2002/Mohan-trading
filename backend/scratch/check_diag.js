const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://nceyweiskamspdxfxnga.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, brand, image_url, additional_images, whatsapp_main_media_id, whatsapp_additional_media_ids');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Vehicles in Supabase:");
    console.log(JSON.stringify(data, null, 2));
  }
}
check();
