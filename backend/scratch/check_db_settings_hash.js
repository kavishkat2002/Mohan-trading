const crypto = require('crypto');

const token = 'EAANwHLegKxUBRmlcC2S0UTdsKgelKZC8Crst8pvMsICAJObEzZAiJXlZAyT77ZB8VNfXQKSIcOqafgrVmmicqdxIUBwLxTOSJq3jZBlZBPGztnHJRRUK2etJ24AfRjKVza3eS8VStf0nu1YSVr7maWhXlbuODZAad6RnLsetGtDQH4eu4pHPOmXBzTJBSgffAZDZD';
const hash = crypto.createHash('sha256').update(token).digest('hex');
console.log("Local settings table token SHA256 hash:", hash);
console.log("Expected hash in Supabase secrets:", "0c3e2a908414cc33008365c99e80850faa93633f14f59bbdedd280f2b8ca9e3b");
console.log("Match:", hash === "0c3e2a908414cc33008365c99e80850faa93633f14f59bbdedd280f2b8ca9e3b");
