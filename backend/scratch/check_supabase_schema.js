const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

async function run() {
  try {
    const res = await axios.get(process.env.SUPABASE_URL + '/rest/v1/', {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    console.log('Exposed tables and views:');
    const definitions = res.data.definitions;
    if (definitions) {
      Object.keys(definitions).forEach(tableName => {
        console.log(`- ${tableName}`);
        // print columns
        const properties = definitions[tableName].properties;
        if (properties) {
          console.log('  Columns:', Object.keys(properties).join(', '));
        }
      });
    } else {
      console.log('No definitions found, entire response keys:', Object.keys(res.data));
    }
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error.message);
  }
  process.exit(0);
}

run();
