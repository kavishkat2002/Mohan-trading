const express = require('express');
const router = express.Router();
const db = require('../db');

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Get settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({});
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  const {
    name, contact_email, contact_phone, business_type, description,
    bank_name, bank_account_holder, bank_account_number, bank_branch, bank_swift_code,
    payment_gateway_name, payment_gateway_link, whatsapp_phone_number_id, slogan, logo_url,
    whatsapp_token, meta_app_id, meta_config_id,
    ai_enabled, ai_model, ai_system_prompt, ai_business_description, ai_faq_data,
    ai_bot_name, ai_dealership_name, ai_greeting_message, ai_tone, ai_language, ai_emoji_usage,
    ai_ask_name_rule, ai_ask_budget_rule, ai_unanswered_limit, ai_objections
  } = req.body;
  
  try {
    const values = [
      name, contact_email, contact_phone, business_type, description,
      bank_name, bank_account_holder, bank_account_number, bank_branch, bank_swift_code,
      payment_gateway_name, payment_gateway_link, whatsapp_phone_number_id, slogan, logo_url,
      whatsapp_token, meta_app_id, meta_config_id,
      ai_enabled, ai_model, ai_system_prompt, ai_business_description,
      ai_faq_data !== undefined ? (typeof ai_faq_data === 'string' ? ai_faq_data : JSON.stringify(ai_faq_data)) : undefined,
      ai_bot_name, ai_dealership_name, ai_greeting_message, ai_tone, ai_language, ai_emoji_usage,
      ai_ask_name_rule, ai_ask_budget_rule, ai_unanswered_limit,
      ai_objections !== undefined ? (typeof ai_objections === 'string' ? ai_objections : JSON.stringify(ai_objections)) : undefined
    ].map(v => v === undefined ? null : v);

    const { rows } = await db.query(
      `UPDATE settings 
       SET name = COALESCE($1, name),
           contact_email = COALESCE($2, contact_email),
           contact_phone = COALESCE($3, contact_phone),
           business_type = COALESCE($4, business_type),
           description = COALESCE($5, description),
           bank_name = COALESCE($6, bank_name),
           bank_account_holder = COALESCE($7, bank_account_holder),
           bank_account_number = COALESCE($8, bank_account_number),
           bank_branch = COALESCE($9, bank_branch),
           bank_swift_code = COALESCE($10, bank_swift_code),
           payment_gateway_name = COALESCE($11, payment_gateway_name),
           payment_gateway_link = COALESCE($12, payment_gateway_link),
           whatsapp_phone_number_id = COALESCE($13, whatsapp_phone_number_id),
           slogan = COALESCE($14, slogan),
           logo_url = COALESCE($15, logo_url),
           whatsapp_token = COALESCE($16, whatsapp_token),
           meta_app_id = COALESCE($17, meta_app_id),
           meta_config_id = COALESCE($18, meta_config_id),
           ai_enabled = COALESCE($19, ai_enabled),
           ai_model = COALESCE($20, ai_model),
           ai_system_prompt = COALESCE($21, ai_system_prompt),
           ai_business_description = COALESCE($22, ai_business_description),
           ai_faq_data = COALESCE($23, ai_faq_data),
           ai_bot_name = COALESCE($24, ai_bot_name),
           ai_dealership_name = COALESCE($25, ai_dealership_name),
           ai_greeting_message = COALESCE($26, ai_greeting_message),
           ai_tone = COALESCE($27, ai_tone),
           ai_language = COALESCE($28, ai_language),
           ai_emoji_usage = COALESCE($29, ai_emoji_usage),
           ai_ask_name_rule = COALESCE($30, ai_ask_name_rule),
           ai_ask_budget_rule = COALESCE($31, ai_ask_budget_rule),
           ai_unanswered_limit = COALESCE($32, ai_unanswered_limit),
           ai_objections = COALESCE($33, ai_objections)
       WHERE id = 1 RETURNING *`,
      values
    );

    const updatedSettings = rows[0];

    // Sync settings to Supabase settings lead
    if (supabase && updatedSettings) {
      const settingsData = {
        ai_enabled: updatedSettings.ai_enabled,
        ai_model: updatedSettings.ai_model,
        ai_system_prompt: updatedSettings.ai_system_prompt,
        ai_business_description: updatedSettings.ai_business_description,
        ai_faq_data: updatedSettings.ai_faq_data,
        ai_bot_name: updatedSettings.ai_bot_name,
        ai_dealership_name: updatedSettings.ai_dealership_name,
        ai_greeting_message: updatedSettings.ai_greeting_message,
        ai_tone: updatedSettings.ai_tone,
        ai_language: updatedSettings.ai_language,
        ai_emoji_usage: updatedSettings.ai_emoji_usage,
        ai_ask_name_rule: updatedSettings.ai_ask_name_rule,
        ai_ask_budget_rule: updatedSettings.ai_ask_budget_rule,
        ai_unanswered_limit: updatedSettings.ai_unanswered_limit,
        ai_objections: updatedSettings.ai_objections
      };

      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', 'SYSTEM_SETTINGS')
          .maybeSingle();

        if (lead) {
          await supabase
            .from('leads')
            .update({
              name: 'SYSTEM_SETTINGS',
              notes: JSON.stringify(settingsData)
            })
            .eq('phone', 'SYSTEM_SETTINGS');
        } else {
          await supabase
            .from('leads')
            .insert({
              phone: 'SYSTEM_SETTINGS',
              name: 'SYSTEM_SETTINGS',
              status: 'New',
              notes: JSON.stringify(settingsData)
            });
        }
        console.log('[Supabase Sync] Settings synced successfully.');
      } catch (err) {
        console.error('[Supabase Sync] Settings sync failed:', err.message);
      }
    }

    res.json(updatedSettings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import AI service for simulation testing
const { generateSmartReply } = require('../services/ai');

// Test AI Chat response (for Model Training Simulator)
router.post('/test-chat', async (req, res) => {
  const { userMessage, ai_system_prompt, ai_business_description, ai_faq_data, ai_model, chatHistory } = req.body;
  try {
    const result = await generateSmartReply(userMessage, {
      ai_system_prompt,
      ai_business_description,
      ai_faq_data,
      ai_model,
      chatHistory: chatHistory || []
    });
    res.json(result);
  } catch (error) {
    console.error("Test chat simulation failed:", error);
    res.status(500).json({ error: error.message || 'Simulation failed' });
  }
});

module.exports = router;
