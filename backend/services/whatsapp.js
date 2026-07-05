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
      .select('id, name')
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
    } else if (lead.name === 'WhatsApp User' && name !== 'WhatsApp User') {
      // Update name if it was previously default
      await supabase
        .from('leads')
        .update({ name })
        .eq('id', lead.id);
    }
    return lead.id;
  } catch (err) {
    console.error('[Supabase Sync] Failed to ensure lead:', err.message);
    return null;
  }
}

// Sync message to Supabase to trigger real-time updates on client
async function syncMessageToSupabase(phone, sender, content, senderName = 'WhatsApp User') {
  if (!supabase) return null;
  const normPhone = normalizePhone(phone);
  try {
    const supaLeadId = await ensureLeadInSupabase(normPhone, senderName);
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

// ─── Test Drive Keyword Detection ───────────────────────────────────────────
const TEST_DRIVE_KEYWORDS = [
  'test drive', 'test ride', 'test run', 'testdrive', 'testride',
  'test-drive', 'test-ride', 'trial drive', 'demo drive', 'demo ride',
  'try the car', 'try a car', 'drive the car', 'book a test',
  'schedule a test', 'want to test', 'like to test'
];

function detectTestDriveKeyword(text) {
  const lower = text.toLowerCase();
  return TEST_DRIVE_KEYWORDS.some(kw => lower.includes(kw));
}

// Auto-create a 'whatsapp_auto' test drive entry when intent is detected.
// Picks the first in-stock vehicle matching the lead's interested_car, or any in-stock vehicle.
async function autoCreateTestDriveBooking(lead) {
  try {
    // Check if we already created one recently (within last 2 hours) to avoid duplicates
    const { rows: existing } = await db.query(
      `SELECT id FROM test_drives 
       WHERE lead_id = $1 AND source = 'whatsapp_auto' 
         AND created_at > NOW() - INTERVAL '2 hours'`,
      [lead.id]
    );
    if (existing.length > 0) {
      console.log(`[TestDrive Auto] Skipping duplicate for lead ${lead.id} — recent whatsapp_auto entry exists`);
      return;
    }

    // Try to find a matching vehicle
    let vehicleId = null;
    if (lead.interested_car) {
      const { rows: matched } = await db.query(
        `SELECT id FROM vehicles WHERE brand ILIKE $1 AND stock > 0 LIMIT 1`,
        [`%${lead.interested_car}%`]
      );
      if (matched.length > 0) vehicleId = matched[0].id;
    }
    // Fallback: any in-stock vehicle
    if (!vehicleId) {
      const { rows: any } = await db.query(
        `SELECT id FROM vehicles WHERE stock > 0 ORDER BY created_at DESC LIMIT 1`
      );
      if (any.length > 0) vehicleId = any[0].id;
    }

    if (!vehicleId) {
      console.log(`[TestDrive Auto] No in-stock vehicle found, skipping auto-booking for lead ${lead.id}`);
      return;
    }

    // Book 1 day from now as a placeholder
    const tentativeDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.query(
      `INSERT INTO test_drives (lead_id, vehicle_id, booking_date, notes, status, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        lead.id,
        vehicleId,
        tentativeDate,
        'Auto-detected via WhatsApp conversation — please confirm date & time with customer.',
        'Scheduled',
        'whatsapp_auto'
      ]
    );
    console.log(`[TestDrive Auto] Created pending test drive for lead ${lead.id} (vehicle ${vehicleId})`);
  } catch (err) {
    console.error(`[TestDrive Auto] Failed to auto-create test drive: ${err.message}`);
  }
}

/**
 * Saves a confirmed test drive booking from the AI agent.
 * Handles slot-conflict check, upsert of whatsapp_auto entries, and new inserts.
 * Returns an object { success, message }.
 */
async function saveTestDriveBooking(leadId, bookingInfo) {
  const { vehicle_id, date_time, booked } = bookingInfo;

  // Guard: booked must be literally true (boolean)
  if (booked !== true) {
    return { success: false, message: 'booked flag is not true' };
  }

  if (!vehicle_id || !date_time) {
    console.warn(`[TestDrive Save] Missing vehicle_id (${vehicle_id}) or date_time (${date_time}) for lead ${leadId}`);
    return { success: false, message: 'Missing vehicle_id or date_time' };
  }

  const vehicleIdInt = parseInt(vehicle_id, 10);
  if (isNaN(vehicleIdInt)) {
    console.warn(`[TestDrive Save] vehicle_id is not a valid integer: "${vehicle_id}"`);
    return { success: false, message: `vehicle_id "${vehicle_id}" is not a valid integer` };
  }

  // Validate and parse date_time
  const bookingDate = new Date(date_time);
  if (isNaN(bookingDate.getTime())) {
    console.warn(`[TestDrive Save] date_time "${date_time}" is not a valid date for lead ${leadId}`);
    return { success: false, message: `Invalid date_time: "${date_time}"` };
  }

  try {
    // Slot-conflict check: another lead already booked the same vehicle within 1 hour
    const { rows: conflicts } = await db.query(
      `SELECT id FROM test_drives
       WHERE vehicle_id = $1
         AND lead_id != $2
         AND status != 'Cancelled'
         AND ABS(EXTRACT(EPOCH FROM (booking_date - $3::timestamptz))) < 3600`,
      [vehicleIdInt, leadId, bookingDate.toISOString()]
    );
    if (conflicts.length > 0) {
      console.log(`[TestDrive Save] Slot conflict for lead ${leadId} on vehicle ${vehicleIdInt} at ${date_time}`);
      return { success: false, message: 'Slot is already taken. Please offer another time.' };
    }

    // Check if there's a whatsapp_auto entry we should upgrade instead of duplicating
    const { rows: autoEntries } = await db.query(
      `SELECT id FROM test_drives WHERE lead_id = $1 AND source = 'whatsapp_auto' LIMIT 1`,
      [leadId]
    );

    if (autoEntries.length > 0) {
      await db.query(
        `UPDATE test_drives
         SET vehicle_id = $1, booking_date = $2, notes = $3, source = 'whatsapp_confirmed', status = 'Scheduled', updated_at = NOW()
         WHERE id = $4`,
        [vehicleIdInt, bookingDate.toISOString(), 'Confirmed via WhatsApp AI Agent', autoEntries[0].id]
      );
      console.log(`[TestDrive Save] ✅ Upgraded whatsapp_auto entry ${autoEntries[0].id} to confirmed for lead ${leadId}`);
    } else {
      const { rows: inserted } = await db.query(
        `INSERT INTO test_drives (lead_id, vehicle_id, booking_date, notes, status, source)
         VALUES ($1, $2, $3, $4, 'Scheduled', 'whatsapp_confirmed')
         RETURNING id`,
        [leadId, vehicleIdInt, bookingDate.toISOString(), 'Confirmed via WhatsApp AI Agent']
      );
      console.log(`[TestDrive Save] ✅ New test drive #${inserted[0].id} saved for lead ${leadId} on vehicle ${vehicleIdInt} at ${bookingDate.toISOString()}`);
    }
    return { success: true };
  } catch (err) {
    console.error(`[TestDrive Save] ❌ DB error for lead ${leadId}: ${err.message}`);
    return { success: false, message: err.message };
  }
}


// Main logic for AI Sales Assistant (WhatsApp Flow)
async function handleIncomingMessage(phone, text, senderName = 'WhatsApp User') {
  const normPhone = normalizePhone(phone);
  // 1. RECOVER OR CREATE LEAD (Tier 2 Memory)
  let leadResult = await db.query('SELECT * FROM leads WHERE phone = $1', [normPhone]);
  let lead = leadResult.rows[0];

  if (!lead) {
    const insertRes = await db.query(
      'INSERT INTO leads (phone, name, status, current_step, chat_metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [normPhone, senderName, 'New', 'START', '{}']
    );
    lead = insertRes.rows[0];
  } else if (lead.name === 'WhatsApp User' && senderName !== 'WhatsApp User') {
    const updateRes = await db.query(
      'UPDATE leads SET name = $1 WHERE id = $2 RETURNING *',
      [senderName, lead.id]
    );
    lead = updateRes.rows[0] || lead;
  }

  // ─── 'Clear' Command Handler ─────────────────────────────────────────────
  if (text.trim().toLowerCase() === 'clear') {
    console.log(`[WhatsApp Service] Clear command received from ${normPhone}. Erasing chat memory.`);
    
    // Delete all messages for this lead to erase memory
    await db.query('DELETE FROM messages WHERE lead_id = $1', [lead.id]);
    
    // Reset the lead profile fields that the AI collected
    await db.query(`
      UPDATE leads 
      SET interested_car = NULL, budget = NULL, status = 'New' 
      WHERE id = $1
    `, [lead.id]);

    await sendWhatsAppMessage(normPhone, "Your chat memory has been successfully cleared! Let me know how I can help you today. 🧹✨");
    return;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Sync incoming message to Supabase first
  const supabaseId = await syncMessageToSupabase(normPhone, 'customer', text, senderName);

  // 2. LOG INCOMING MESSAGE
  await db.query(
    'INSERT INTO messages (lead_id, sender, content, supabase_id) VALUES ($1, $2, $3, $4)',
    [lead.id, 'customer', text, supabaseId]
  );

  // ── Unconditional Test Drive Keyword Detection ──
  if (detectTestDriveKeyword(text)) {
    await autoCreateTestDriveBooking(lead);
  }

  // Fetch settings to check if AI responder is enabled
  const settingsRes = await db.query('SELECT * FROM settings WHERE id = 1');
  const settings = settingsRes.rows[0] || {};

  let outMsg = "";
  let sendImageUrls = [];

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

    // Fetch lead details and existing test drive bookings to provide conversational memory
    const bookingsRes = await db.query(
      `SELECT td.*, v.brand as vehicle_brand 
       FROM test_drives td
       LEFT JOIN vehicles v ON td.vehicle_id = v.id
       WHERE td.lead_id = $1 
       ORDER BY td.booking_date DESC`,
      [lead.id]
    );

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
      ai_objections: settings.ai_objections,
      // Lead context
      leadName: lead.name,
      leadPhone: lead.phone,
      leadInterestedCar: lead.interested_car,
      leadBudget: lead.budget,
      leadBookings: bookingsRes.rows
    });

    outMsg = aiResult.reply;
    sendImageUrls = aiResult.send_image_urls || [];
    if (aiResult.send_image_url) { // Backwards compatibility just in case
      sendImageUrls.push(aiResult.send_image_url);
    }

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

      // Handle Test Drive Booking (AI confirmed a specific date+vehicle)
      const tdBooking = info.test_drive_booking;
      console.log(`[AI Agent] test_drive_booking from AI:`, JSON.stringify(tdBooking));

      if (tdBooking) {
        const { success, message } = await saveTestDriveBooking(lead.id, {
          vehicle_id: tdBooking.vehicle_id,
          date_time: tdBooking.date_time,
          booked: tdBooking.booked
        });
        if (!success) {
          console.warn(`[AI Agent] Test drive NOT saved: ${message}`);
          outMsg = `⚠️ Sorry, there was an issue scheduling your test drive: ${message}. Could you please provide a different time or confirm the details?`;
        }
      }
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
    if (outMsg) {
      if (sendImageUrls && sendImageUrls.length > 0) {
        // Send the first image with the caption
        await sendWhatsAppMessage(normPhone, outMsg, lead.id, 'bot', sendImageUrls[0]);
        // Send any remaining images without caption (or with a generic caption)
        for (let i = 1; i < sendImageUrls.length; i++) {
          await sendWhatsAppMessage(normPhone, '📸', lead.id, 'bot', sendImageUrls[i]);
        }
      } else {
        await sendWhatsAppMessage(normPhone, outMsg, lead.id, 'bot');
      }
    }
}

module.exports = {
  handleIncomingMessage,
  sendWhatsAppMessage
};
