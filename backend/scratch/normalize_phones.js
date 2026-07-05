const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  user: process.env.DB_USER || 'kavishkathilakarathna',
  host: process.env.DB_HOST || '/tmp',
  database: process.env.DB_NAME || 'crm_db',
  password: process.env.DB_PASSWORD || undefined,
  port: parseInt(process.env.DB_PORT) || 5432,
};
const pool = new Pool(dbConfig);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

function normalizePhone(phone) {
  if (!phone) return '';
  if (phone === 'SYSTEM_SETTINGS') return 'SYSTEM_SETTINGS';
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  // Replace leading 0 with 94
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.slice(1);
  }
  return cleaned;
}

async function runLocalCleanup() {
  console.log('--- Starting Local CRM Database Phone Normalization ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Fetch all leads
    const { rows: leads } = await client.query('SELECT * FROM leads ORDER BY id ASC');
    const seenPhones = {}; // phone -> leadId
    
    for (let lead of leads) {
      if (lead.phone === 'SYSTEM_SETTINGS') continue;
      
      const origPhone = lead.phone;
      const normalized = normalizePhone(origPhone);
      
      if (!normalized) continue;
      
      if (seenPhones[normalized]) {
        // Duplicate found! We need to merge this lead into the seen one.
        const targetLeadId = seenPhones[normalized];
        console.log(`[Local] Duplicate found: "${lead.name}" (${origPhone}, ID: ${lead.id}) matches target ID: ${targetLeadId}. Merging...`);
        
        // 1. Move messages to target lead
        await client.query('UPDATE messages SET lead_id = $1 WHERE lead_id = $2', [targetLeadId, lead.id]);
        
        // 2. Move test drives to target lead
        await client.query('UPDATE test_drives SET lead_id = $1 WHERE lead_id = $2', [targetLeadId, lead.id]);
        
        // 3. Delete duplicate lead
        await client.query('DELETE FROM leads WHERE id = $1', [lead.id]);
      } else {
        seenPhones[normalized] = lead.id;
        if (origPhone !== normalized) {
          console.log(`[Local] Normalizing: ${origPhone} -> ${normalized}`);
          await client.query('UPDATE leads SET phone = $1 WHERE id = $2', [normalized, lead.id]);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('[Local] CRM DB Cleanup complete successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Local] CRM DB Cleanup error:', err);
  } finally {
    client.release();
  }
}

async function runSupabaseCleanup() {
  if (!supabase) {
    console.log('[Supabase] Client not initialized. Skipping.');
    return;
  }
  console.log('\n--- Starting Supabase Database Phone Normalization ---');
  try {
    // 1. Fetch all leads from Supabase
    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').order('id', { ascending: true });
    if (leadsErr) throw leadsErr;
    
    const seenPhones = {}; // phone -> leadId
    
    for (let lead of leads) {
      if (lead.phone === 'SYSTEM_SETTINGS') continue;
      
      const origPhone = lead.phone;
      const normalized = normalizePhone(origPhone);
      
      if (!normalized) continue;
      
      if (seenPhones[normalized]) {
        const targetLeadId = seenPhones[normalized];
        console.log(`[Supabase] Duplicate found: "${lead.name}" (${origPhone}, ID: ${lead.id}) matches target ID: ${targetLeadId}. Merging...`);
        
        // 1. Fetch messages of duplicate lead
        const { data: supaMsgs } = await supabase.from('messages').select('*').eq('lead_id', lead.id);
        if (supaMsgs && supaMsgs.length > 0) {
          // Re-insert messages under target lead
          const newMsgs = supaMsgs.map(m => ({
            lead_id: targetLeadId,
            sender: m.sender,
            content: m.content,
            created_at: m.created_at
          }));
          await supabase.from('messages').insert(newMsgs);
        }
        
        // 2. Delete duplicate lead (which cascades or we delete messages first)
        await supabase.from('messages').delete().eq('lead_id', lead.id);
        const { error: delErr } = await supabase.from('leads').delete().eq('id', lead.id);
        if (delErr) console.error('[Supabase] Delete lead error:', delErr.message);
      } else {
        seenPhones[normalized] = lead.id;
        if (origPhone !== normalized) {
          console.log(`[Supabase] Normalizing: ${origPhone} -> ${normalized}`);
          const { error: updErr } = await supabase.from('leads').update({ phone: normalized }).eq('id', lead.id);
          if (updErr) console.error('[Supabase] Update phone error:', updErr.message);
        }
      }
    }
    console.log('[Supabase] Cleanup complete successfully!');
  } catch (err) {
    console.error('[Supabase] Cleanup error:', err);
  }
}

async function main() {
  await runLocalCleanup();
  await runSupabaseCleanup();
  pool.end();
}

main();
