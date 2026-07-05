const crypto = require('crypto');
require('dotenv').config();

const token = process.env.WHATSAPP_TOKEN;
const hash = crypto.createHash('sha256').update(token).digest('hex');
console.log("Local token SHA256 hash:", hash);
console.log("Expected hash in Supabase secrets:", "0c3e2a908414cc33008365c99e80850faa93633f14f59bbdedd280f2b8ca9e3b");
console.log("Match:", hash === "0c3e2a908414cc33008365c99e80850faa93633f14f59bbdedd280f2b8ca9e3b");
