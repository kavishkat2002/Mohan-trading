const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    // First, find the lead ID for the phone number
    const { data: lead, error: lErr } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', '94703375336')
      .maybeSingle();

    if (lErr) {
      console.error("Error finding lead:", lErr.message);
      return;
    }
    
    if (!lead) {
      console.error("Lead not found");
      return;
    }

    console.log("--- LEAD DETAILS ---");
    console.log(lead);

    const { data: messages, error: mErr } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (mErr) {
      console.error("Error fetching messages:", mErr.message);
    } else {
      console.log('--- RECENT MESSAGES ---');
      console.log(JSON.stringify(messages, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
