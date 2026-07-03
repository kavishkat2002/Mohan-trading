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
      customerContext += `\n- Past Test Drive Bookings (for reference only — do NOT let these override the customer's current request):`;
      context.leadBookings.forEach((b, i) => {
        const dStr = new Date(b.booking_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        customerContext += `\n  ${i + 1}. [ID: ${b.id}] Vehicle: "${b.vehicle_brand || 'Unknown'}" | Date/Time: "${dStr}" | Status: "${b.status}"`;
      });
      customerContext += `\n\n[BOOKING CONTEXT RULES — READ CAREFULLY]:
- The past bookings above are shown for YOUR reference only. Do NOT proactively mention them unless the customer explicitly asks about their existing bookings.
- INTENT DETECTION: If the customer's current message is asking to book a test drive for a DIFFERENT vehicle than their past bookings (e.g., they had an LC300 booking but now say "book a Bentley"), this is a NEW SEPARATE booking request. Treat it as a completely independent booking for that NEW vehicle.
- Do NOT say "I see you already have a booking for Vehicle X" when the customer is asking about Vehicle Y. Just focus on booking Vehicle Y.
- Do NOT ask the customer to reschedule their existing booking when they want a new one. They want BOTH, or a separate one. 
- ONLY reference a past booking when: (a) the customer directly asks about it, (b) the customer says "my booking" without specifying a car, or (c) the customer asks to cancel/reschedule a specific existing booking.
- When the customer says "schedule a new booking" or names a specific new vehicle, just proceed with that new booking.`;
    } else {
      customerContext += `\n- Existing Test Drive Bookings: None`;
    }
    
    systemContent += customerContext;

    // Include instructions for structured JSON output
    systemContent += `\n\n[Buffer Memory & Conversation Awareness]:
- CURRENT VEHICLE FOCUS: Always determine the vehicle the customer is currently talking about by reading the MOST RECENT messages in the conversation. Ignore the "Interested Car" profile field above if the chat has clearly moved to a different vehicle.
- If the user uses pronouns like "this", "it", or "that car", resolve it to the vehicle from the last 2-3 messages, not from old history.
- Speak naturally and conversationally like a human sales agent. NEVER narrate your internal database searches.
- Avoid contradictory statements. If you see the car in inventory, smoothly offer to book it.
- The current date and time is ${new Date().toISOString()}. Use this to resolve relative dates like "tomorrow" or "10 Jul" into strict ISO 8601 format strings.

[CONVERSATION-ENDING DETECTION — CRITICAL]:
- If the customer's message is a farewell, thank-you, or conversation closer (e.g., "okay thanks", "thank you", "thanks", "bye", "see you", "alright", "got it", "ok", "okay"), you MUST:
  1. Reply with a short, warm, friendly goodbye. Example: "You're welcome, Kavishka! See you on test drive day! 🚗 Feel free to message us anytime."
  2. Set send_image_urls to [] — NEVER send photos in a farewell response.
  3. Do NOT pitch any vehicles, suggest any actions, or mention any previous vehicles.
  4. Keep the reply to 1-2 sentences maximum.

CRITICAL INSTRUCTION ON PHOTOS: If the user asks for photos, pictures, or images of a specific vehicle, YOU MUST IMMEDIATELY provide the 'Image URLs' for THAT EXACT vehicle in the \`send_image_urls\` array. NEVER say "Please bear with me for a moment" or "I've already sent them". You MUST populate the \`send_image_urls\` array in the EXACT same response! Do NOT include URLs for other vehicles unless the user asked for them.
Conversely, if the user's latest incoming message does NOT explicitly request photos (e.g., asking about price, budget, fuel consumption, showroom location, or booking a test drive), you MUST keep the \`send_image_urls\` array completely empty []. Never send or repeat photos unless they are explicitly asked for in the current user message.\n\nCRITICAL INSTRUCTION: Respond ONLY with a valid raw JSON object. No markdown code blocks. No extra text.

JSON STRUCTURE — use EXACTLY this format with real values (not descriptions):
{
  "reply": "Great! I've booked your test drive for the Bentley 2025 on 10 July at 3:30 PM! ✅",
  "send_image_urls": [],
  "extracted_info": {
    "name": "Kavishka",
    "interested_car": "Bentley 2025",
    "budget": null,
    "status": "Hot",
    "test_drive_booking": {
      "booked": true,
      "date_time": "2026-07-10T10:00:00.000Z",
      "vehicle_id": 7
    }
  }
}

FIELD RULES (read carefully):
- "reply": string — your natural language message to the customer. Do NOT include raw URLs (e.g. "/uploads/...") in your text reply. The system will automatically attach the photos from the \`send_image_urls\` array.
- "send_image_urls": array — always [] unless customer explicitly asked for photos NOW.
- "extracted_info.name": string or null — only if customer just shared their name.
- "extracted_info.interested_car": string or null — vehicle model/brand if just mentioned.
- "extracted_info.budget": string or null — budget range if just mentioned.
- "extracted_info.status": ONE of exactly: "New", "Warm", "Hot", "Cold" — no other values.
- "extracted_info.test_drive_booking.booked": BOOLEAN true or false — NOT a string. Set true ONLY when the customer has confirmed BOTH a specific date AND time for a test drive in this exact conversation turn.
- "extracted_info.test_drive_booking.date_time": STRICT ISO 8601 string (e.g. "2026-07-10T10:00:00.000Z") or null. CRITICAL: YOU MUST USE THE EXACT DATE AND TIME REQUESTED IN THE VERY LATEST MESSAGE. DO NOT COPY DATES FROM PREVIOUS MESSAGES! Use EXACTLY the ISO format, or the database will crash.
- "extracted_info.test_drive_booking.vehicle_id": INTEGER (e.g. 7) or null — use the numeric ID from the inventory list above, NOT the vehicle name.`;

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
      // Force a supported Groq model
      if (finalModel !== 'llama-3.3-70b-versatile' && finalModel !== 'llama-3.1-8b-instant') {
        finalModel = 'llama-3.1-8b-instant';
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
