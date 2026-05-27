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

async function generateFinanceAnalysis(userMessage, financeData) {
  if (!OPENAI_API_KEY) {
    console.log("No OPENAI_API_KEY found, returning fallback for finance.");
    return `Mock AI Analysis: Your total monthly sales are Rs. ${financeData.monthSales?.toLocaleString() || 0} and total expenses are Rs. ${financeData.totalExpenses?.toLocaleString() || 0}. Add an OPENAI_API_KEY to your .env to enable real analysis!`;
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert Financial Analyst AI for Mohan Traders (a premium car dealership). 
Your task is to answer the user's questions strictly based on the provided live financial data. Be concise, professional, and do not make up data.
Live Financial Data Overview:
- Today's Sales: Rs. ${financeData.todaySales}
- Month's Sales: Rs. ${financeData.monthSales}
- Total Expenses: Rs. ${financeData.totalExpenses}
- Account Balances: ${JSON.stringify(financeData.balances)}
` 
          },
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
    console.error('Error with OpenAI API in Finance:', error.message);
    return "I am currently unable to access the live financial models. Please try again later.";
  }
}

module.exports = {
  generateSmartReply,
  generateFinanceAnalysis
};
