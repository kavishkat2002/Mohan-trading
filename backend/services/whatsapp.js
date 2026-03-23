const axios = require('axios');
const db = require('../db');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'YOUR_META_API_TOKEN';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';

const WA_API_URL = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

// Send a plain text message via WhatsApp
async function sendWhatsAppMessage(to, text, leadId = null) {
  try {
    // Log outgoing message to DB
    if (leadId) {
       await db.query('INSERT INTO messages (lead_id, sender, content) VALUES ($1, $2, $3)', [leadId, 'bot', text]);
    }

    await axios.post(
      WA_API_URL,
      { messaging_product: 'whatsapp', to: to, text: { body: text } },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  }
}

// Main logic for AI Sales Assistant (WhatsApp Flow)
async function handleIncomingMessage(phone, text) {
  // 1. RECOVER OR CREATE LEAD (Tier 2 Memory)
  let leadResult = await db.query('SELECT * FROM leads WHERE phone = $1', [phone]);
  let lead = leadResult.rows[0];

  if (!lead) {
    const insertRes = await db.query(
      'INSERT INTO leads (phone, name, status, current_step, chat_metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [phone, 'WhatsApp User', 'New', 'START', '{}']
    );
    lead = insertRes.rows[0];
  }

  // 2. LOG INCOMING MESSAGE
  await db.query('INSERT INTO messages (lead_id, sender, content) VALUES ($1, $2, $3)', [lead.id, 'customer', text]);

  let step = lead.current_step || 'START';
  let metadata = lead.chat_metadata || {};
  let outMsg = "";

  const inputLower = text.toLowerCase();
  if (inputLower === 'reset' || inputLower === 'hi' || inputLower === 'hello') {
    step = 'START';
    metadata = {};
  }

  // 3. STATE MACHINE (Tier 1 Memory)
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
      
      // AI MEMORY TIER 3: Semantic Inventory Search
      try {
          // Parse budget for query (simplistic budget limit extraction)
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
      // Sync detailed lead info
      await db.query('UPDATE leads SET interested_car = $1, budget = $2, status = $3 WHERE id = $4', [metadata.type, metadata.budget, 'Warm', lead.id]);
      break;

    case 'COMPLETED':
      outMsg = "We already have your details! Our team is working on your request. (Reply 'reset' to start over)";
      break;

    default:
      outMsg = "Thanks for your message! Our team will be with you shortly.";
  }

  // 4. PERSIST STATE AND SEND
  await db.query('UPDATE leads SET current_step = $1, chat_metadata = $2 WHERE id = $3', [step, JSON.stringify(metadata), lead.id]);
  await sendWhatsAppMessage(phone, outMsg, lead.id);
}

module.exports = {
  handleIncomingMessage,
  sendWhatsAppMessage
};
