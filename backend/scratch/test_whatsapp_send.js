const axios = require('axios');
const db = require('../db');

async function testSend() {
  console.log('[Test] Fetching active WhatsApp credentials from settings...');
  try {
    const { rows } = await db.query('SELECT whatsapp_token, whatsapp_phone_number_id FROM settings WHERE id = 1');
    const settings = rows[0] || {};
    
    const token = settings.whatsapp_token;
    const phoneId = settings.whatsapp_phone_number_id;
    const to = '94762345336';
    const text = 'Hello from Mohan Trading CRM! This is a test message to verify connection.';

    console.log('[Test] Phone Number ID:', phoneId);
    console.log('[Test] Token length:', token?.length);
    console.log('[Test] Recipient:', to);

    if (!token || !phoneId) {
      console.log('[Test] Error: Missing token or phone number ID in settings!');
      process.exit(1);
    }

    const waUrl = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    console.log('[Test] Posting to Meta API...');
    const response = await axios.post(
      waUrl,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Test] Success! Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('[Test] Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  } finally {
    process.exit(0);
  }
}

testSend();
