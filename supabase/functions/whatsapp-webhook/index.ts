// @ts-ignore – resolved by Deno at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore – resolved by Deno at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Deno ambient type for VS Code
declare const Deno: { env: { get(key: string): string | undefined } };

const VERIFY_TOKEN = "mohan_trading_token";

serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. Handle Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2. Handle Incoming Messages (POST)
  try {
    const payload = await req.json();
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    // Only process actual incoming messages (ignore status updates)
    if (!messages || messages.length === 0) {
      return new Response("OK", { status: 200 });
    }

    const message = messages[0];
    const rawPhone = message.from;
    
    // Normalization helper
    const normalizePhone = (p: string) => {
      if (!p) return "";
      if (p === "SYSTEM_SETTINGS") return "SYSTEM_SETTINGS";
      let cleaned = p.replace(/\D/g, "");
      if (cleaned.length === 10 && cleaned.startsWith("0")) {
        return "94" + cleaned.substring(1);
      }
      return cleaned;
    };
    
    const phone = normalizePhone(rawPhone);
    const text = (message.text?.body || "").trim();

    console.log(`[WEBHOOK] Incoming from ${phone}: "${text}"`);

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find or create lead in the 'leads' table
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (!lead) {
      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          phone,
          name: "WhatsApp User",
          status: "New",
          notes: `First message: ${text}`
        })
        .select()
        .single();

      if (insertErr) {
        console.error("[WEBHOOK] Failed to insert lead:", insertErr.message);
        return new Response("OK", { status: 200 });
      }
      lead = newLead;
      console.log("[WEBHOOK] New lead created:", lead.id);
    }

    // Log the incoming message in 'messages' table
    await supabase.from('messages').insert({
      lead_id: lead.id,
      sender: 'customer',
      content: text
    });

    // 3. Fetch Settings from Supabase 'leads' where phone = 'SYSTEM_SETTINGS'
    const { data: settingsLead } = await supabase
      .from('leads')
      .select('notes')
      .eq('phone', 'SYSTEM_SETTINGS')
      .maybeSingle();

    let settings = {
      ai_enabled: true,
      ai_model: 'openai/gpt-3.5-turbo',
      ai_system_prompt: 'You are an AI sales assistant for Mohan Trading, a premium car dealership in Sri Lanka. Be helpful, polite, and professional. Guide the customer through buying, selling, or booking test drives. Politely collect their name, interested car type, and budget range during the chat.',
      ai_business_description: 'Mohan Trading is a premium car dealership located in Colombo, Sri Lanka. We offer high-quality luxury cars, SUVs, and vans with warranty, flexible leasing partners, and a dedicated service station.',
      ai_faq_data: []
    };

    if (settingsLead && settingsLead.notes) {
      try {
        const parsed = JSON.parse(settingsLead.notes);
        settings = { ...settings, ...parsed };
      } catch (e) {
        console.error("[WEBHOOK] Failed to parse settings JSON:", e);
      }
    }

    let outMsg = "";
    let sendImageUrls: string[] = [];

    if (settings.ai_enabled) {
      // ─── SMART AI RESPONDER FLOW ────────────────────────────────────
      console.log(`[WEBHOOK] AI enabled. Processing message for lead ${lead.id} using model ${settings.ai_model}...`);
      
      // Fetch last 6 messages for short-term history
      const { data: historyData } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(6);

      const chatHistory = (historyData || []).reverse();

      // Call OpenRouter / OpenAI
      const aiResult = await generateSmartReply(text, {
        ai_system_prompt: settings.ai_system_prompt,
        ai_business_description: settings.ai_business_description,
        ai_faq_data: settings.ai_faq_data,
        ai_model: settings.ai_model,
        chatHistory: chatHistory,
        ai_bot_name: (settings as any).ai_bot_name,
        ai_dealership_name: (settings as any).ai_dealership_name,
        ai_greeting_message: (settings as any).ai_greeting_message,
        ai_tone: (settings as any).ai_tone,
        ai_language: (settings as any).ai_language,
        ai_emoji_usage: (settings as any).ai_emoji_usage,
        ai_ask_name_rule: (settings as any).ai_ask_name_rule,
        ai_ask_budget_rule: (settings as any).ai_ask_budget_rule,
        ai_unanswered_limit: (settings as any).ai_unanswered_limit,
        ai_objections: (settings as any).ai_objections,
        supabaseClient: supabase
      });

      outMsg = aiResult.reply;
      sendImageUrls = aiResult.send_image_urls || [];
      if (aiResult.send_image_url) {
        sendImageUrls.push(aiResult.send_image_url);
      }

      // Update lead details in Supabase
      if (aiResult.extracted_info) {
        const info = aiResult.extracted_info;
        const updateObj: Record<string, any> = {};

        if (info.name && (lead.name === 'WhatsApp User' || !lead.name)) {
          updateObj.name = info.name;
        }
        if (info.interested_car) {
          updateObj.interested_car = info.interested_car;
        }
        if (info.budget) {
          updateObj.budget = info.budget;
        }
        if (info.status && ['New', 'Warm', 'Hot', 'Cold', 'Completed'].includes(info.status)) {
          updateObj.status = info.status;
        }

        updateObj.notes = `STATE:${JSON.stringify({ step: 'AI_AGENT', meta: info })}`;

        await supabase.from('leads').update(updateObj).eq('id', lead.id);
        console.log(`[WEBHOOK] Lead details updated:`, info);
        
        if (info.test_drive_booking && info.test_drive_booking.booked && info.test_drive_booking.vehicle_id && info.test_drive_booking.date_time) {
          try {
            const { error: tdErr } = await supabase.from('test_drives').insert({
              lead_id: lead.id,
              vehicle_id: parseInt(info.test_drive_booking.vehicle_id, 10),
              booking_date: info.test_drive_booking.date_time,
              notes: "Booked via WhatsApp AI Agent",
              status: "Scheduled"
            });
            if (tdErr) {
              console.error(`[WEBHOOK] Failed to book test drive: ${tdErr.message}`);
            } else {
              console.log(`[WEBHOOK] Test drive booked for lead ${lead.id} on vehicle ${info.test_drive_booking.vehicle_id}`);
            }
          } catch (e: any) {
             console.error(`[WEBHOOK] Error inserting test drive: ${e.message}`);
          }
        }
      } else {
        await supabase.from('leads').update({
          notes: `STATE:${JSON.stringify({ step: 'AI_AGENT', meta: {} })}`
        }).eq('id', lead.id);
      }

    } else {
      console.log("[WEBHOOK] AI is disabled, skipping message generation.");
      return new Response("OK", { status: 200 });
    }

    // Log outbound message
    await supabase.from('messages').insert({
      lead_id: lead.id,
      sender: 'bot',
      content: outMsg
    });

    // Send WhatsApp reply
    await sendWhatsApp(phone, outMsg, sendImageUrls);

    console.log(`[WEBHOOK] Replied to ${phone}`);
    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("[WEBHOOK ERROR]", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
});

async function generateSmartReply(userMessage: string, context: any) {
  let apiKey = Deno.env.get("OPENAI_API_KEY");
  console.log("Deno.env OPENAI_API_KEY present:", !!apiKey, "starts with gsk_:", apiKey?.startsWith('gsk_'));

  if (!apiKey) {
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
        console.error("Failed to parse objections JSON inside AI service in Deno:", e);
      }
      if (Array.isArray(objections) && objections.length > 0) {
        systemContent += `\n\nHow to handle customer objections:\n` + objections.map((obj: any) => `- Objection: "${obj.objection}"\n  Target Response: "${obj.response}"`).join('\n');
      }
    }

    let faqs = context.ai_faq_data;
    if (faqs) {
      try {
        if (typeof faqs === 'string') {
          faqs = JSON.parse(faqs);
        }
      } catch (e) {
        console.error("Failed to parse FAQ JSON inside AI service Deno:", e);
      }
      if (Array.isArray(faqs) && faqs.length > 0) {
        systemContent += `\n\nFrequently Asked Questions (FAQs):\n` + faqs.map((faq: any) => `Q: ${faq.q}\nA: ${faq.a}`).join('\n\n');
      }
    }

    // Query active showroom inventory from Supabase db
    try {
      if (context.supabaseClient) {
        const { data: vehicles, error } = await context.supabaseClient
          .from('vehicles')
          .select('*');
          
        if (!error && vehicles) {
          const availableVehicles = vehicles.filter((v: any) => v.stock > 0);
          if (availableVehicles && availableVehicles.length > 0) {
            systemContent += "\n\nAvailable Showroom Inventory Stock (Use this live inventory to suggest options to customers):\n" + 
              availableVehicles.map((v: any) => {
                let allImages: string[] = [];
                if (v.image_url) {
                  try {
                    const parsed = JSON.parse(v.image_url);
                    if (Array.isArray(parsed)) allImages.push(...parsed);
                    else allImages.push(String(v.image_url));
                  } catch (e) {
                    if (Array.isArray(v.image_url)) allImages.push(...v.image_url);
                    else allImages.push(String(v.image_url));
                  }
                }
                if (v.additional_images) {
                  try {
                    const parsedAdd = typeof v.additional_images === 'string' ? JSON.parse(v.additional_images) : v.additional_images;
                    if (Array.isArray(parsedAdd)) allImages.push(...parsedAdd);
                  } catch (e) {}
                }
                const imagesStr = allImages.length > 0 ? allImages.join(', ') : '';
                return `- ID: ${v.id} | Model: ${v.brand} | Price: LKR ${parseFloat(v.price).toLocaleString()} | Category: ${v.category} | Stock: ${v.stock}${v.description ? ` | Description: ${v.description}` : ''}${imagesStr ? ` | Image URLs: ${imagesStr}` : ''}`;
              }).join('\n');
          } else {
            systemContent += "\n\nAvailable Showroom Inventory Stock: (Currently no vehicles in stock). Please inform the customer politely.";
          }
        } else {
          console.error("Failed to fetch vehicles from Supabase:", error?.message);
        }
      }
    } catch (dbErr: any) {
      console.error("Failed to query vehicles in Deno:", dbErr.message || dbErr);
    }

    // Anti-hallucination constraint
    systemContent += `\n\nCRITICAL INSTRUCTION ON VEHICLE MATCHING: Never hallucinate or invent vehicle brands, models, or details. If a user asks for a car (e.g. 'LC 300'), refer ONLY to the provided 'Available Showroom Inventory Stock' list to match the vehicle correctly. If the requested vehicle IS in stock, enthusiastically confirm availability IN YOUR VERY FIRST REPLY (e.g., "Great news! We have the Toyota Land Cruiser LC300 in stock!"). NEVER say "Let me check the inventory" or "I will check for you" - you already have the inventory data, so answer immediately. If the exact vehicle isn't in the inventory, politely inform them that it is currently out of stock or offer the closest available alternative. Do not make up names.\n`;

    // Include instructions for structured JSON output
    systemContent += `\n\nCRITICAL INSTRUCTION: You MUST respond ONLY in a valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. Output raw JSON only.
CRITICAL INSTRUCTION: NEVER include image URLs or links directly in the "reply" text. The "reply" should only contain conversational text.
The JSON must have this exact structure:
{
  "reply": "Your conversational response to the customer here in a polite, helpful, and friendly tone. DO NOT put any image URLs in this text.",
  "send_image_urls": ["An array of up to 5 exact image path values from the matching vehicle in the inventory (e.g. ['/uploads/photo1.jpg', '/uploads/photo2.jpg']) if the customer explicitly requested photos of that vehicle and photos are available in the inventory. Provide an empty array [] otherwise."],
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
      context.chatHistory.forEach((msg: any) => {
        const role = (msg.sender === 'customer' || msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
        const content = msg.content || '';
        if (content) {
          messages.push({ role, content });
        }
      });
    }

    // Append current user message
    messages.push({ role: 'user', content: userMessage });

    let finalApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    let finalModel = model;

    if (apiKey.startsWith('gsk_')) {
      finalApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      if (!finalModel.startsWith('llama') && !finalModel.startsWith('mixtral') && !finalModel.startsWith('gemma')) {
        finalModel = 'llama-3.1-8b-instant';
      }
    }

    const response = await fetch(finalApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: finalModel,
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 800
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }

    let text = data.choices[0].message.content.trim();
    
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

  } catch (error: any) {
    console.error('Error with OpenRouter API in Deno:', error.message || error);
    return {
      reply: `I am having a little trouble connecting to my brain right now. Error: ${error.message || 'Unknown error'}`,
      extracted_info: null
    };
  }
}

async function sendWhatsApp(to: string, text: string, imageUrls: string[] = []): Promise<void> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("PHONE_NUMBER_ID");

  if (!token || !phoneId) {
    console.error("[sendWhatsApp] Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID");
    return;
  }

  // Helper to construct fully-qualified public URL for media files
  const getPublicUrl = (urlPath: string) => {
    if (urlPath.startsWith('http')) return urlPath;
    const baseUrl = Deno.env.get("BACKEND_URL") || Deno.env.get("PUBLIC_URL") || "https://mohan-trading.herokuapp.com";
    
    let finalBaseUrl = baseUrl.replace(/\/$/, '');
    // If they provided the root Vercel URL, automatically append the backend route prefix
    if (finalBaseUrl.includes('vercel.app') && !finalBaseUrl.endsWith('/_/backend')) {
      finalBaseUrl += '/_/backend';
    }
    
    return `${finalBaseUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  };

  let payloads: any[] = [];
  let sentText = false;

  if (imageUrls && imageUrls.length > 0) {
    const urlsToProcess = imageUrls.slice(0, 5); // Max 5 images
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      const lower = url.toLowerCase();
      const isSupported = lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
      
      if (isSupported) {
        const publicImgUrl = getPublicUrl(url);
        let isReachable = false;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);
          const checkRes = await fetch(publicImgUrl, { method: "HEAD", signal: controller.signal });
          clearTimeout(timeoutId);
          if (checkRes.ok) {
            isReachable = true;
          } else {
            console.error(`Image URL not reachable: ${publicImgUrl} (Status: ${checkRes.status})`);
          }
        } catch (e: any) {
          console.error(`Image URL check failed for ${publicImgUrl}:`, e);
        }

        if (isReachable) {
          console.log(`[sendWhatsApp] Preparing to send image: ${publicImgUrl}`);
          payloads.push({
            messaging_product: "whatsapp",
            to: to,
            type: "image",
            image: {
              link: publicImgUrl,
              caption: i === 0 ? text : "" // Only put text caption on the first image
            }
          });
          if (i === 0) sentText = true;
        } else {
          console.warn(`[sendWhatsApp] Image url ${publicImgUrl} is unreachable.`);
        }
      } else {
        console.warn(`[sendWhatsApp] Image format of ${url} is not supported by WhatsApp (JPEG/PNG only).`);
      }
    }
  }

  // If no valid images were found, or none were provided, just send text
  if (!sentText) {
    payloads.push({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    });
  }

  // Send payloads sequentially
  for (const payload of payloads) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[sendWhatsApp] Failed:", data);
      } else {
        console.log(`[sendWhatsApp] Message sent successfully (msg id: ${data.messages?.[0]?.id})`);
      }
    } catch (e) {
      console.error("[sendWhatsApp] Network error:", e);
    }
    if (payloads.length > 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
