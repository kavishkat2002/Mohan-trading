const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log('Using Token:', WHATSAPP_TOKEN ? WHATSAPP_TOKEN.substring(0, 15) + '...' : 'undefined');
console.log('Using Phone Number ID:', PHONE_NUMBER_ID);

const to = '94762345336'; // Sri Lanka country code prefix (94) + number
const WA_API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

async function testSend() {
  try {
    const response = await axios.post(
      WA_API_URL,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: 'Test message from Mohan Traders CRM script' }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  }
}

testSend();
