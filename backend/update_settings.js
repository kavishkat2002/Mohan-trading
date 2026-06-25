require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('settings')
    .update({ openai_api_key: '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' })
    .eq('id', 1);

  console.log("Update Error:", error);
  console.log("Update Data:", data);
}

run();
