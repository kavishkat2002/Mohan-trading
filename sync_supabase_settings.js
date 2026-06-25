const { createClient } = require('@supabase/supabase-js');
const db = require('./backend/db');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
  const updatedSettings = rows[0];

  const settingsData = {
    ai_enabled: updatedSettings.ai_enabled,
    ai_model: updatedSettings.ai_model,
    ai_system_prompt: updatedSettings.ai_system_prompt,
    ai_business_description: updatedSettings.ai_business_description,
    ai_faq_data: typeof updatedSettings.ai_faq_data === 'string' ? JSON.parse(updatedSettings.ai_faq_data) : updatedSettings.ai_faq_data,
    ai_bot_name: updatedSettings.ai_bot_name,
    ai_dealership_name: updatedSettings.ai_dealership_name,
    ai_greeting_message: updatedSettings.ai_greeting_message,
    ai_tone: updatedSettings.ai_tone,
    ai_language: updatedSettings.ai_language,
    ai_emoji_usage: updatedSettings.ai_emoji_usage,
    ai_ask_name_rule: updatedSettings.ai_ask_name_rule,
    ai_ask_budget_rule: updatedSettings.ai_ask_budget_rule,
    ai_unanswered_limit: updatedSettings.ai_unanswered_limit,
    ai_objections: typeof updatedSettings.ai_objections === 'string' ? JSON.parse(updatedSettings.ai_objections) : updatedSettings.ai_objections
  };

  const { error } = await supabase.from('leads').update({
    notes: JSON.stringify(settingsData)
  }).eq('phone', 'SYSTEM_SETTINGS');

  if (error) {
    console.error("Error syncing to Supabase:", error.message);
  } else {
    console.log("Successfully synced settings to Supabase!");
  }
  process.exit(0);
}

sync();
