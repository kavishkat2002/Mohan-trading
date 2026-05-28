const axios = require('axios');

async function testSync() {
  try {
    const res = await axios.post('http://localhost:5001/api/messages/sync', {
      lead_id: 15,
      messages: [
        { sender: 'customer', content: 'Sync Test Message 1', created_at: new Date().toISOString() }
      ]
    });
    console.log('Sync Response:', res.data);
  } catch (err) {
    console.error('Sync Error:', err.response ? err.response.data : err.message);
  }
}

testSync();
