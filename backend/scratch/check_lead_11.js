const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const db = require('../db');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const phone = '94762345336';
  console.log(`Checking database and Supabase for phone ${phone}...`);

  // 1. Local lead
  const { rows: localLeads } = await db.query('SELECT * FROM leads WHERE phone = $1', [phone]);
  console.log('Local lead:', localLeads[0]);

  if (localLeads.length > 0) {
    const localLead = localLeads[0];
    const { rows: localMessages } = await db.query('SELECT * FROM messages WHERE lead_id = $1 ORDER BY id ASC', [localLead.id]);
    console.log(`Local messages count: ${localMessages.length}`);
    console.log('Local messages:', localMessages);
  }

  // 2. Supabase lead
  const { data: supaLead } = await supabase.from('leads').select('*').eq('phone', phone).maybeSingle();
  console.log('Supabase lead:', supaLead);

  if (supaLead) {
    const { data: supaMessages } = await supabase.from('messages').select('*').eq('lead_id', supaLead.id);
    console.log(`Supabase messages count: ${supaMessages?.length}`);
    console.log('Supabase messages:', supaMessages);
  }

  process.exit(0);
}

run();
