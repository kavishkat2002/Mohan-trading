const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*');

  if (leadErr) {
    console.error('Lead error:', leadErr);
    process.exit(1);
  }

  console.log('All Supabase Leads:', lead);

  if (lead) {
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.error('Messages error:', msgErr);
    } else {
      console.log('Messages for Lead in Supabase:', messages);
    }
  }

  process.exit(0);
}

run();
