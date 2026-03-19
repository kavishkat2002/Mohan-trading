const axios = require('axios');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function generateSmartReply(userMessage, context) {
  if (!OPENAI_API_KEY) {
    console.log("No OPENAI_API_KEY found, returning fallback.");
    // Fallback if no API key is provided
    return "Our sales team will get back to you shortly, or you can call us directly.";
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `You are an AI sales assistant for Mohan Trading, a premium car dealership. Be helpful, concise, and professional. The user is currently at this stage: ${context.step}. Their name is ${context.name || 'unknown'}.` },
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error with OpenAI API:', error.message);
    return "I'm having a little trouble thinking right now. A human agent will contact you soon!";
  }
}

module.exports = {
  generateSmartReply
};
