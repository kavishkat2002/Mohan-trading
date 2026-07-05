const axios = require('axios');
require('dotenv').config();

const phoneId = process.env.PHONE_NUMBER_ID;
const token = 'EAANwHLegKxUBRmlcC2S0UTdsKgelKZC8Crst8pvMsICAJObEzZAiJXlZAyT77ZB8VNfXQKSIcOqafgrVmmicqdxIUBwLxTOSJq3jZBlZBPGztnHJRRUK2etJ24AfRjKVza3eS8VStf0nu1YSVr7maWhXlbuODZAad6RnLsetGtDQH4eu4pHPOmXBzTJBSgffAZDZD';
const to = '94703375336';

async function test() {
  console.log(`Testing WhatsApp send using token from settings table and phoneId: ${phoneId}`);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: 'Hello from settings table token test!' }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

test();
