require('dotenv').config();
const { generateSmartReply } = require('../services/ai');

(async () => {
  const result = await generateSmartReply("is it posible to arrange a test drive for honda vezel");
  console.log(result.reply);
})();
