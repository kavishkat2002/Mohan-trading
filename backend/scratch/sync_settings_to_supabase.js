const db = require('../db');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
    if (rows.length === 0) {
      console.log('No local settings found.');
      process.exit(1);
    }
    const localSettings = rows[0];

    const settingsData = {
      ai_enabled: localSettings.ai_enabled,
      ai_model: localSettings.ai_model,
      ai_system_prompt: localSettings.ai_system_prompt,
      ai_business_description: localSettings.ai_business_description,
      ai_faq_data: localSettings.ai_faq_data
    };

    console.log('Syncing local settings to Supabase settings lead:', settingsData);

    // 1. Check if the settings lead already exists
    const { data: lead, error: selectError } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', 'SYSTEM_SETTINGS')
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (lead) {
      console.log('Found existing settings lead, updating...');
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          name: 'SYSTEM_SETTINGS',
          notes: JSON.stringify(settingsData)
        })
        .eq('phone', 'SYSTEM_SETTINGS');

      if (updateError) throw updateError;
    } else {
      console.log('Creating new settings lead...');
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          phone: 'SYSTEM_SETTINGS',
          name: 'SYSTEM_SETTINGS',
          status: 'New',
          notes: JSON.stringify(settingsData)
        });

      if (insertError) throw insertError;
    }

    console.log('Successfully synced settings to Supabase!');
  } catch (err) {
    console.error('Error syncing settings:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
