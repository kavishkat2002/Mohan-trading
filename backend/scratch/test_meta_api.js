const axios = require('axios');
require('dotenv').config();

const phoneId = process.env.PHONE_NUMBER_ID;
const token = process.env.WHATSAPP_TOKEN;
const to = '94703375336';

async function test() {
  console.log(`Testing WhatsApp send using phoneId: ${phoneId}`);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: 'Hello from local test script!' }
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
