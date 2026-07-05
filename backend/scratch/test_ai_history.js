require('dotenv').config();
const { generateSmartReply } = require('../services/ai');

(async () => {
  const chatHistory = [
    { sender: 'bot', content: 'I can arrange a test drive for your wife on Honda Vezel on July 30th at 1pm. Let me confirm if the vehicle is available.' }
  ];
  const context = {
    chatHistory: chatHistory,
    leadName: 'Kavishka'
  };
  const result = await generateSmartReply("is it posible to arrange a test drive for honda vezel", context);
  console.log(result.reply);
})();
