const { generateSmartReply } = require('../services/ai');
const db = require('../db');
require('dotenv').config();

async function run() {
  const chatHistory = [
    { sender: 'customer', content: 'Kavishka  10M' },
    { sender: 'bot', content: "Hello Kavishka 👋! Thanks for sharing your budget of LKR 10,000,000 🙏. We have some great options available within your budget. I'd like to recommend the Toyota Land Cruiser LC300, which is a brand new luxury SUV priced at LKR 10,000,000 🚗. We also have the Honda Vezel, a used sedan priced at LKR 10,000,000 🚗. Which one of these options interests you? Or would you like me to suggest more options? 🤔" }
  ];

  const settingsRes = await db.query('SELECT * FROM settings WHERE id = 1');
  const settings = settingsRes.rows[0] || {};

  console.log("Generating smart reply for message: 'noo i choosed that Toyota Land Cruiser LC300'");
  try {
    const res = await generateSmartReply('noo i choosed that Toyota Land Cruiser LC300', {
      ai_system_prompt: settings.ai_system_prompt,
      ai_business_description: settings.ai_business_description,
      ai_faq_data: settings.ai_faq_data,
      ai_model: settings.ai_model,
      chatHistory: chatHistory,
      ai_bot_name: settings.ai_bot_name,
      ai_dealership_name: settings.ai_dealership_name,
      ai_greeting_message: settings.ai_greeting_message,
      ai_tone: settings.ai_tone,
      ai_language: settings.ai_language,
      ai_emoji_usage: settings.ai_emoji_usage,
      ai_ask_name_rule: settings.ai_ask_name_rule,
      ai_ask_budget_rule: settings.ai_ask_budget_rule,
      ai_unanswered_limit: settings.ai_unanswered_limit,
      ai_objections: settings.ai_objections
    });
    console.log("AI Result:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
