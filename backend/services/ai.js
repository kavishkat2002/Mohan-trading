const axios = require('axios');
const db = require('../db');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function generateSmartReply(userMessage, context = {}) {
  if (!OPENAI_API_KEY) {
    console.log("No OPENAI_API_KEY found, returning fallback.");
    return {
      reply: "Our sales team will get back to you shortly, or you can call us directly.",
      extracted_info: null
    };
  }

  try {
    const model = context.ai_model || 'openai/gpt-3.5-turbo';

    let systemContent = "";
    if (context.ai_bot_name) {
      systemContent = `You are ${context.ai_bot_name}, a helpful, polite, and ${context.ai_tone || 'professional'} sales representative at ${context.ai_dealership_name || 'Mohan Trading'}.
Greeting message (first thing you say to introduce yourself): "${context.ai_greeting_message || 'Hi!'}"

Personality and Style Rules:
- Primary Tone: ${context.ai_tone || 'Professional & warm'}.
- Preferred Language: ${context.ai_language || 'Bilingual (Sinhala and English)'}.
- Emojis style: ${context.ai_emoji_usage || 'Use emojis - feels friendly'}.
- Rules for asking customer name: ${context.ai_ask_name_rule || '3rd message'}.
- Rules for asking customer budget: ${context.ai_ask_budget_rule || '3rd message'}.
- Follow-up behavior rule: ${context.ai_unanswered_limit || '1 follow-up then stop'}.
- Always be helpful, polite, and professional. Avoid being pushy.`;

      if (context.ai_system_prompt) {
        systemContent += `\n\nAdditional Instructions:\n${context.ai_system_prompt}`;
      }
    } else {
      systemContent = context.ai_system_prompt || `You are an AI sales assistant for Mohan Trading, a premium car dealership in Sri Lanka. Be helpful, polite, and professional. Guide the customer through buying, selling, or booking test drives. Politely collect their name, interested car type, and budget range during the chat.`;
    }

    if (context.ai_business_description) {
      systemContent += `\n\nAbout our dealership showroom:\n${context.ai_business_description}`;
    }

    let objections = context.ai_objections;
    if (objections) {
      try {
        if (typeof objections === 'string') {
          objections = JSON.parse(objections);
        }
      } catch (e) {
        console.error("Failed to parse objections JSON inside AI service:", e);
      }
      if (Array.isArray(objections) && objections.length > 0) {
        systemContent += `\n\nHow to handle customer objections:\n` + objections.map(obj => `- Objection: "${obj.objection}"\n  Target Response: "${obj.response}"`).join('\n');
      }
    }

    let faqs = context.ai_faq_data;
    if (faqs) {
      try {
        if (typeof faqs === 'string') {
          faqs = JSON.parse(faqs);
        }
      } catch (e) {
        console.error("Failed to parse FAQ JSON inside AI service:", e);
      }
      if (Array.isArray(faqs) && faqs.length > 0) {
        systemContent += `\n\nFrequently Asked Questions (FAQs):\n` + faqs.map(faq => `Q: ${faq.q}\nA: ${faq.a}`).join('\n\n');
      }
    }

    // Fetch active showroom inventory to auto-train AI
    let vehiclesContext = "";
    try {
      const { rows: vehicles } = await db.query('SELECT id, brand, price, category, stock, description, ai_notes, image_url, additional_images FROM vehicles WHERE stock > 0');
      if (vehicles && vehicles.length > 0) {
        vehiclesContext = "\n\nAvailable Showroom Inventory Stock (Use this live inventory to suggest options to customers):\n" + 
          vehicles.map(v => `- ID: ${v.id} | Model: ${v.brand} | Price: LKR ${parseFloat(v.price).toLocaleString()} | Category: ${v.category} | Stock: ${v.stock}${v.description ? ` | Description: ${v.description}` : ''}${v.ai_notes ? ` | Custom AI guidelines: ${v.ai_notes}` : ''}${v.image_url ? ` | Image: ${v.image_url}` : ''}${v.additional_images && v.additional_images.length > 0 ? ` | Additional Images: ${JSON.stringify(v.additional_images)}` : ''}`).join('\n');
      }
    } catch (dbErr) {
      console.error("Failed to query vehicles inside AI service:", dbErr);
    }
    if (vehiclesContext) {
      systemContent += vehiclesContext;
    }

    // Include current customer's profile and existing bookings to give the AI memory
    let customerContext = `\n\n[Current Customer Context / Profile]:
- Lead Name: "${context.leadName || 'WhatsApp User'}"
- Lead Phone: "${context.leadPhone || 'Unknown'}"
- Interested Car: "${context.leadInterestedCar || 'Not specified'}"
- Budget: "${context.leadBudget || 'Not specified'}"`;

    if (context.leadBookings && context.leadBookings.length > 0) {
      customerContext += `\n- Existing Test Drive Bookings (Memory):`;
      context.leadBookings.forEach((b, i) => {
        const dStr = new Date(b.booking_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        customerContext += `\n  ${i + 1}. [ID: ${b.id}] Vehicle: "${b.vehicle_brand || 'Unknown'}" | Scheduled Date/Time: "${dStr}" | Status: "${b.status}" | Notes: "${b.notes || 'None'}"`;
      });
      customerContext += `\n\nCRITICAL CONTEXTUAL RULE: If the customer references their existing booking (e.g. saying they already booked, or asking about their appointment), acknowledge it! Do NOT ask them for booking details again or attempt to create a new booking unless they specifically want to book another session or reschedule.`;
    } else {
      customerContext += `\n- Existing Test Drive Bookings: None`;
    }
    
    systemContent += customerContext;

    // Include instructions for structured JSON output
    systemContent += `\n\n[Buffer Memory & Summary Memory]:
- You must always remember the specific vehicle, brand, or topic that the user is currently focused on from the chat history.
- If the user uses pronouns like "this", "it", or "that car", resolve it to the vehicle recently discussed (e.g., "Ford Raptor 2025" from previous messages).
- When asked for photos of "this", ONLY send photos of the exact vehicle they are focused on. Do NOT send photos of other vehicles like the LC300 unless explicitly requested.
- Speak naturally and conversationally, like a human sales agent. NEVER narrate your internal database searches (e.g., do not say "I checked the inventory" or "I couldn't find a booking, but I found the car"). 
- Avoid contradictory statements like "I couldn't find X, but we have X". If you see the car in the inventory, just smoothly offer to book it!

CRITICAL INSTRUCTION ON PHOTOS: YOU MUST NOT populate the \`send_image_urls\` array UNLESS the user's VERY LATEST incoming message explicitly asks to see photos, pictures, or images (e.g., "show me", "send pictures"). For ANY OTHER response (including simple confirmations like "yes", "yep", "okay", answering questions, or booking a test drive), you MUST leave \`send_image_urls\` as an empty array []. NEVER send photos proactively when confirming bookings to avoid sending irrelevant images.
CRITICAL INSTRUCTION: You MUST respond ONLY in a valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. Output raw JSON only.
The JSON must have this exact structure:
{
  "reply": "Your conversational response to the customer here in a polite, helpful, and friendly tone. CRITICAL: Do NOT mention or include raw file paths like '/uploads/...' in this reply text! Just say 'Here are the photos:'",
  "send_image_urls": ["The exact 'Image' path value from the matching vehicle in the inventory (e.g. '/uploads/filename.jpg'). CRITICAL: ONLY populate this array if the user's latest incoming message explicitly asks to see photos, pictures, or images. If the user's latest message is a question about price, mileage, budget, or other information, you MUST use [] to avoid duplicate photos."],
  "extracted_info": {
    "name": "Customer's name if they shared it or if you just learned it, otherwise null",
    "interested_car": "The type of vehicle, brand, or model they are looking to buy or sell if they just shared it, otherwise null",
    "budget": "Their budget range if they just shared it, otherwise null",
    "status": "Recommended lead status based on their interest level: 'New' (first greeting), 'Warm' (inquiring details), 'Hot' (ready to buy/sell/book test drive), 'Cold' (not interested)",
    "test_drive_booking": {
      "booked": "Boolean true if the customer just confirmed a test drive booking with a specific time/date, otherwise false",
      "date_time": "The exact date and time agreed upon for the test drive in ISO format (e.g. '2026-07-01T10:00:00Z') or null if none",
      "vehicle_id": "The numeric ID of the vehicle from the inventory they are booking for, or null if unknown"
    }
  }
}`;

    const messages = [
      { role: 'system', content: systemContent }
    ];

    // Format and append chat history
    if (context.chatHistory && Array.isArray(context.chatHistory)) {
      context.chatHistory.forEach(msg => {
        const role = (msg.sender === 'customer' || msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
        const content = msg.content || msg.body || '';
        if (content) {
          messages.push({ role, content });
        }
      });
    }

    // Append current user message
    messages.push({ role: 'user', content: userMessage });

    let finalApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    let finalModel = model;

    if (OPENAI_API_KEY.startsWith('gsk_')) {
      finalApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      if (!finalModel.startsWith('llama') && !finalModel.startsWith('mixtral') && !finalModel.startsWith('gemma')) {
        finalModel = 'llama-3.3-70b-versatile';
      }
    }

    const response = await axios.post(
      finalApiUrl,
      {
        model: finalModel,
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let text = response.data.choices[0].message.content.trim();
    
    // Strip markdown code blocks if the model wrapped it
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.reply === 'string') {
        return parsed;
      }
      throw new Error("Missing 'reply' in parsed response");
    } catch (e) {
      console.warn("Failed to parse JSON response from LLM, returning raw text as reply:", text);
      return {
        reply: text,
        extracted_info: null
      };
    }

  } catch (error) {
    console.error('Error with OpenRouter API:', error.response ? error.response.data : error.message);
    return {
      reply: "I am having a little trouble connecting to my brain right now. A human agent will contact you soon!",
      extracted_info: null
    };
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
