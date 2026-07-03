require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('vehicles').select('id, brand, stock');
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
check();
