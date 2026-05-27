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
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
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

async function generateFinanceAnalysis(userMessage, financeData, history = []) {
  if (!OPENAI_API_KEY) {
    console.log("No OPENAI_API_KEY found, returning fallback for finance.");
    return `Mock AI Analysis: Your total monthly sales are Rs. ${financeData.monthSales?.toLocaleString() || 0} and total expenses are Rs. ${financeData.totalExpenses?.toLocaleString() || 0}. Add an OPENAI_API_KEY to your .env to enable real analysis!`;
  }

  try {
    const systemPrompt = { 
      role: 'system', 
      content: `You are FinAI, an expert and highly confident Financial Advisor for Mohan Traders (a premium car dealership). 
Your task is to answer the user's questions strictly based on the provided live financial data. 

Guidelines for your style:
- Be highly conversational, engaging, and confident.
- Do NOT sound robotic or overly formal (avoid phrases like "Based on the provided data..." or "cannot be determined").
- If you don't have the exact breakdown (e.g. individual car sales), confidently state what you DO know (e.g. "I don't have the car-by-car breakdown right now, but your total sales this month are looking solid at...").
- Keep answers relatively concise and easy to read.
- Use emojis occasionally to make the text lively.

Live Financial Data Overview:
- Today's Sales: Rs. ${financeData.todaySales.toLocaleString()}
- Month's Sales: Rs. ${financeData.monthSales.toLocaleString()}
- Total Expenses: Rs. ${financeData.totalExpenses.toLocaleString()}
- Account Balances: ${JSON.stringify(financeData.balances)}
` 
    };

    // Format frontend history to OpenAI format
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content
    }));

    // If the last message in history is the current userMessage, don't duplicate it.
    // (The frontend already appended it to the history array)
    const messages = [systemPrompt, ...formattedHistory];
    
    // Fallback if history wasn't sent correctly with the current message
    if (formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1].content !== userMessage) {
        messages.push({ role: 'user', content: userMessage });
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: messages
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
    console.error('Error with OpenAI API in Finance:', error.message);
    return "I am currently unable to access the live financial models. Please try again later.";
  }
}

module.exports = {
  generateSmartReply,
  generateFinanceAnalysis
};
