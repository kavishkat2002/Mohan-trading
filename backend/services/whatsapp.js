const axios = require('axios');
const db = require('../db');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'YOUR_META_API_TOKEN';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';

const WA_API_URL = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

// Session store for conversational state (in-memory for demo, should be Redis in production)
const userSessions = {};

// Send a plain text message via WhatsApp
async function sendWhatsAppMessage(to, text) {
  try {
    await axios.post(
      WA_API_URL,
      {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  }
}

// Interactive Message Component Flow
async function handleIncomingMessage(phone, text) {
  const session = userSessions[phone] || { step: 'START' };

  if (text.toLowerCase() === 'reset' || text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
    session.step = 'START';
  }

  switch (session.step) {
    case 'START':
      await sendWhatsAppMessage(
        phone,
        `Hi 👋 Welcome to Mohan Trading 🚗
How can we help you today?
1. Buy a car
2. Sell a car
3. View available cars
(Please reply with a number)`
      );
      session.step = 'WAITING_FOR_ACTION';
      break;

    case 'WAITING_FOR_ACTION':
      if (text === '1') {
        await sendWhatsAppMessage(phone, "Great! What is your name?");
        session.step = 'COLLECT_NAME';
        session.action = 'Buy';
      } else if (text === '2') {
        await sendWhatsAppMessage(phone, "We can help you sell your car. What is your name?");
        session.step = 'COLLECT_NAME';
        session.action = 'Sell';
      } else if (text === '3') {
        await sendWhatsAppMessage(phone, "You can view our available cars on our website: https://mohantrading.com");
        session.step = 'START';
      } else {
        await sendWhatsAppMessage(phone, "Please reply with 1, 2, or 3.");
      }
      break;

    case 'COLLECT_NAME':
      session.name = text;
      await sendWhatsAppMessage(phone, `Nice to meet you, ${session.name}! What budget are you considering? (e.g., $10k-$20k)`);
      session.step = 'COLLECT_BUDGET';
      break;

    case 'COLLECT_BUDGET':
      session.budget = text;
      await sendWhatsAppMessage(phone, "Got it. Lastly, what type of car or specific model are you looking for?");
      session.step = 'COLLECT_CAR';
      break;

    case 'COLLECT_CAR':
      session.car = text;
      
      // Save lead to CRM
      try {
        await db.query(
          'INSERT INTO leads (name, phone, interested_car, budget, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (phone) DO UPDATE SET interested_car = $3, budget = $4',
          [session.name, phone, session.car, session.budget, 'New']
        );
      } catch (err) {
        console.error('Failed to save lead:', err);
      }

      await sendWhatsAppMessage(phone, "Thanks! Your details have been recorded. One of our sales agents will contact you shortly. 🚗💨");
      session.step = 'DONE';
      break;
      
    case 'DONE':
      await sendWhatsAppMessage(phone, "We have already received your request. An agent will be in touch! (Reply 'reset' to start over)");
      break;
  }

  userSessions[phone] = session;
}

module.exports = {
  handleIncomingMessage,
  sendWhatsAppMessage
};
