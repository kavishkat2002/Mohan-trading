const db = require('../db');
const axios = require('axios');

async function run() {
  try {
    // 1. Truncate/delete local messages for lead 28
    console.log('Deleting existing local messages for lead 28...');
    await db.query('DELETE FROM messages WHERE lead_id = 28');

    // 2. Prepare test data resembling Supabase timestamp formats (UTC without timezone suffix)
    const testMessages = [
      {
        id: 9001, // Mock Supabase message ID
        sender: 'customer',
        content: 'Hi, is this Mohan Trading? (Supabase UTC time: 09:20:00)',
        created_at: '2026-05-29T09:20:00.000'
      },
      {
        id: 9002, // Mock Supabase message ID
        sender: 'bot',
        content: 'Yes! Welcome to Mohan Trading. (Supabase UTC time: 09:20:05)',
        created_at: '2026-05-29T09:20:05.123'
      }
    ];

    // 3. Post to our sync endpoint
    console.log('Sending sync payload to http://localhost:5001/api/messages/sync...');
    const response = await axios.post('http://localhost:5001/api/messages/sync', {
      lead_id: 28,
      messages: testMessages
    });

    console.log('Sync response:', response.data);

    // 4. Query and print the messages stored locally to verify correct timezone conversion
    const { rows } = await db.query('SELECT * FROM messages WHERE lead_id = 28 ORDER BY created_at ASC');
    console.log('\n--- VERIFICATION ---');
    console.log('Total messages synced:', rows.length);
    rows.forEach(msg => {
      console.log(`- [${msg.sender}] "${msg.content}"`);
      console.log(`  Supabase ID: ${msg.supabase_id}`);
      console.log(`  Stored locally: ${msg.created_at.toISOString()}`);
    });

    // 5. Test duplicates: run sync again with the exact same payload
    console.log('\nRunning sync again with duplicate messages to verify deduplication by supabase_id...');
    const duplicateRes = await axios.post('http://localhost:5001/api/messages/sync', {
      lead_id: 28,
      messages: testMessages
    });
    console.log('Duplicate Sync response:', duplicateRes.data);

    const checkDupes = await db.query('SELECT count(*) FROM messages WHERE lead_id = 28');
    console.log('Message count after duplicate sync (should be 2):', checkDupes.rows[0].count);

  } catch (err) {
    console.error('Error during simulation:', err.response ? err.response.data : err.message);
  } finally {
    process.exit(0);
  }
}

run();
