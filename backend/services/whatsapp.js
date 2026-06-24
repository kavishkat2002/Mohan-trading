const axios = require('axios');
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'YOUR_META_API_TOKEN';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function normalizePhone(phone) {
  if (!phone) return '';
  if (phone === 'SYSTEM_SETTINGS') return 'SYSTEM_SETTINGS';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '94' + cleaned.substring(1);
  }
  return cleaned;
}

// Ensure lead exists in Supabase so messages can be attached
async function ensureLeadInSupabase(phone, name = 'WhatsApp User') {
  if (!supabase) return null;
  const normPhone = normalizePhone(phone);
  try {
    let { data: lead, error } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', normPhone)
      .maybeSingle();

    if (error) throw error;

    if (!lead) {
      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          phone: normPhone,
          name: name,
          status: 'New'
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      return newLead.id;
    }
    return lead.id;
  } catch (err) {
    console.error('[Supabase Sync] Failed to ensure lead:', err.message);
    return null;
  }
}

// Sync message to Supabase to trigger real-time updates on client
async function syncMessageToSupabase(phone, sender, content) {
  if (!supabase) return null;
  const normPhone = normalizePhone(phone);
  try {
    const supaLeadId = await ensureLeadInSupabase(normPhone);
    if (!supaLeadId) return null;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        lead_id: supaLeadId,
        sender,
        content
      })
      .select('id')
      .single();

    if (error) throw error;
    console.log(`[Supabase Sync] Message synced: [${sender}] "${content.substring(0, 15)}..."`);
    return data ? data.id : null;
  } catch (err) {
    console.error('[Supabase Sync] Failed to sync message:', err.message);
    return null;
  }
}

const WA_API_URL = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

function getPublicUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Send a plain text or image message via WhatsApp
async function sendWhatsAppMessage(to, text, leadId = null, sender = 'bot', imageUrl = null) {
  try {
    // Sync outbound message to Supabase first
    const supabaseId = await syncMessageToSupabase(to, sender, text);

    // Log outgoing message to DB
    if (leadId) {
      await db.query(
        'INSERT INTO messages (lead_id, sender, content, supabase_id) VALUES ($1, $2, $3, $4)',
        [leadId, sender, text, supabaseId]
      );
    }

    // 1. Fetch credentials from database settings
    const settingsRes = await db.query('SELECT whatsapp_token, whatsapp_phone_number_id FROM settings WHERE id = 1');
    const settings = settingsRes.rows[0] || {};

    // Fallback to env values
    const token = settings.whatsapp_token || process.env.WHATSAPP_TOKEN || 'YOUR_META_API_TOKEN';
    const phoneId = settings.whatsapp_phone_number_id || process.env.PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';

    const waUrl = `https://graph.facebook.com/v20.0/${phoneId}/messages`;

    let payload;
    if (imageUrl) {
      const publicImgUrl = getPublicUrl(imageUrl);
      console.log(`[WhatsApp Service] Sending image: ${publicImgUrl}`);
      payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: publicImgUrl,
          caption: text
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      };
    }

    await axios.post(
      waUrl,
      payload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  }
}

// Main logic for AI Sales Assistant (WhatsApp Flow)
async function handleIncomingMessage(phone, text) {
  const normPhone = normalizePhone(phone);
  // 1. RECOVER OR CREATE LEAD (Tier 2 Memory)
  let leadResult = await db.query('SELECT * FROM leads WHERE phone = $1', [normPhone]);
  let lead = leadResult.rows[0];

  if (!lead) {
    const insertRes = await db.query(
      'INSERT INTO leads (phone, name, status, current_step, chat_metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [normPhone, 'WhatsApp User', 'New', 'START', '{}']
    );
    lead = insertRes.rows[0];
  }

  // Sync incoming message to Supabase first
  const supabaseId = await syncMessageToSupabase(normPhone, 'customer', text);

  // 2. LOG INCOMING MESSAGE
  await db.query(
    'INSERT INTO messages (lead_id, sender, content, supabase_id) VALUES ($1, $2, $3, $4)',
    [lead.id, 'customer', text, supabaseId]
  );

  // Fetch settings to check if AI responder is enabled
  const settingsRes = await db.query('SELECT * FROM settings WHERE id = 1');
  const settings = settingsRes.rows[0] || {};

  let outMsg = "";
  let sendImageUrl = null;

  if (settings.ai_enabled) {
    // ---- SMART AI RESPONDER FLOW ----
    console.log(`[AI Agent] Processing message for lead ${lead.id} using model ${settings.ai_model}...`);

    // Fetch last 6 messages for short-term history (which now includes the message just inserted)
    const historyRes = await db.query(
      'SELECT sender, content FROM messages WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 6',
      [lead.id]
    );
    // Reverse to chronological order (since we selected DESC)
    const chatHistory = historyRes.rows.reverse();

    // Call generateSmartReply
    const { generateSmartReply } = require('./ai');
    const aiResult = await generateSmartReply(text, {
      ai_system_prompt: settings.ai_system_prompt,
      ai_business_description: settings.ai_business_description,
      ai_faq_data: settings.ai_faq_data,
      ai_model: settings.ai_model,
      chatHistory: chatHistory,
      ai_bot_name: settings.ai_bot_name,
      ai_dealership_name: settings.ai_dealership_name,
      ai_greeting_message: settings.ai_greeting_message,
      ai_tone: settings.ai_tone,
      ai_language: settings.ai_language,
      ai_emoji_usage: settings.ai_emoji_usage,
      ai_ask_name_rule: settings.ai_ask_name_rule,
      ai_ask_budget_rule: settings.ai_ask_budget_rule,
      ai_unanswered_limit: settings.ai_unanswered_limit,
      ai_objections: settings.ai_objections
    });

    outMsg = aiResult.reply;
    sendImageUrl = aiResult.send_image_url || null;

    // Process extracted info to update lead details
    if (aiResult.extracted_info) {
      const info = aiResult.extracted_info;
      let updateFields = [];
      let updateValues = [];
      let paramCount = 1;

      // Update name if we learned it and current name is generic
      if (info.name && (lead.name === 'WhatsApp User' || lead.name === '')) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(info.name);
        lead.name = info.name;
      }
      // Update interested car
      if (info.interested_car) {
        updateFields.push(`interested_car = $${paramCount++}`);
        updateValues.push(info.interested_car);
        lead.interested_car = info.interested_car;
      }
      // Update budget
      if (info.budget) {
        updateFields.push(`budget = $${paramCount++}`);
        updateValues.push(info.budget);
        lead.budget = info.budget;
      }
      // Update status
      if (info.status && ['New', 'Warm', 'Hot', 'Cold', 'Completed'].includes(info.status)) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(info.status);
        lead.status = info.status;
      }

      // Always update current_step and chat_metadata
      const mergedMetadata = { ...lead.chat_metadata, ...info };
      updateFields.push(`chat_metadata = $${paramCount++}`);
      updateValues.push(JSON.stringify(mergedMetadata));

      updateFields.push(`current_step = $${paramCount++}`);
      updateValues.push('AI_AGENT');

      updateValues.push(lead.id);
      const queryStr = `UPDATE leads SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;
      await db.query(queryStr, updateValues);
      console.log(`[AI Agent] Lead ${lead.id} details updated:`, info);
    } else {
      // Just update current_step to AI_AGENT
      await db.query("UPDATE leads SET current_step = 'AI_AGENT' WHERE id = $1", [lead.id]);
    }
  } else {
    // ---- LEGACY STATE MACHINE FLOW ----
    let step = lead.current_step || 'START';
    let metadata = lead.chat_metadata || {};

    const inputLower = text.toLowerCase();
    if (inputLower === 'reset' || inputLower === 'hi' || inputLower === 'hello') {
      step = 'START';
      metadata = {};
    }

    switch (step) {
      case 'START':
        outMsg = `Hi 👋 Welcome to *Mohan Trading* 🚗\n\nI am your AI Sales Assistant. How can we help you today?\n\n1️⃣ Buy a car\n2️⃣ Sell a car\n3️⃣ View latest Inventory\n\n(Reply with 1, 2, or 3)`;
        step = 'INTENT_DISCOVERY';
        break;

      case 'INTENT_DISCOVERY':
        if (text === '1') {
          outMsg = "Great! 🚗 What is your name?";
          step = 'COLLECT_NAME';
          metadata.intent = 'BUY';
        } else if (text === '2') {
          outMsg = "We can help you sell! What is your name?";
          step = 'COLLECT_NAME';
          metadata.intent = 'SELL';
        } else if (text === '3') {
          outMsg = "Check out our current fleet here: https://mohantrading.com/vehicles \n\nType 'Buy' if you see something you like!";
          step = 'START';
        } else {
          outMsg = "Please reply with 1, 2, or 3 to proceed.";
        }
        break;

      case 'COLLECT_NAME':
        metadata.name = text;
        await db.query('UPDATE leads SET name = $1 WHERE id = $2', [text, lead.id]);
        if (metadata.intent === 'BUY') {
          outMsg = `Nice to meet you, ${text}! What type of vehicle are you looking for? (e.g. SUV, Sedan, Van)`;
          step = 'COLLECT_VEHICLE_TYPE';
        } else {
          outMsg = `Nice to meet you, ${text}! What is the Make and Model of the car you wish to sell?`;
          step = 'COLLECT_SELL_MODEL';
        }
        break;

      case 'COLLECT_VEHICLE_TYPE':
        metadata.type = text;
        outMsg = `Got it. And what is your budget range in LKR? (e.g. 10M - 15M)`;
        step = 'COLLECT_BUDGET';
        break;

      case 'COLLECT_BUDGET':
        metadata.budget = text;

        try {
          const maxBudget = parseInt(text.replace(/[^0-9]/g, ''), 10) || 999999999;
          const { rows: matches } = await db.query(
            'SELECT brand, price, category FROM vehicles WHERE category ILIKE $1 AND price <= $2 LIMIT 3',
            [`%${metadata.type}%`, maxBudget]
          );

          if (matches.length > 0) {
            let carList = matches.map(m => `✅ ${m.brand} - LKR ${m.price}`).join('\n');
            outMsg = `I found some matches 📊:\n\n${carList}\n\nOur specialists will contact you shortly with full details and photos! 🚗💨`;
          } else {
            outMsg = `Thanks! 📊 I'm searching our full network for a ${metadata.type} within your budget. One of our human specialists will follow up with personalized options shortly! 🚗💨`;
          }
        } catch (err) {
          console.error('Inventory search error:', err);
          outMsg = "Thank you! Our sales team will follow up with you shortly with personalized options. 🚗💨";
        }

        step = 'COMPLETED';
        await db.query('UPDATE leads SET interested_car = $1, budget = $2, status = $3 WHERE id = $4', [metadata.type, metadata.budget, 'Warm', lead.id]);
        break;

      case 'COMPLETED':
        outMsg = "We already have your details! Our team is working on your request. (Reply 'reset' to start over)";
        break;

      default:
        outMsg = "Thanks for your message! Our team will be with you shortly.";
    }

    // PERSIST STATE AND SEND
    await db.query('UPDATE leads SET current_step = $1, chat_metadata = $2 WHERE id = $3', [step, JSON.stringify(metadata), lead.id]);
  }

  // 4. SEND OUTGOING MESSAGE
  await sendWhatsAppMessage(phone, outMsg, lead.id, 'bot', sendImageUrl);
}

module.exports = {
  handleIncomingMessage,
  sendWhatsAppMessage
};
