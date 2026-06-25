const crypto = require('crypto');
require('dotenv').config();

const phoneId = process.env.PHONE_NUMBER_ID;
const hash = crypto.createHash('sha256').update(phoneId).digest('hex');
console.log("Local Phone ID SHA256 hash:", hash);
console.log("Expected hash in Supabase secrets:", "417878f2f5994ed1ea50815ec145ff09b598275aa5a955f7ab80e1a75f250ebb");
console.log("Match:", hash === "417878f2f5994ed1ea50815ec145ff09b598275aa5a955f7ab80e1a75f250ebb");
