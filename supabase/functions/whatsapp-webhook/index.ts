// @ts-ignore – resolved by Deno at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore – resolved by Deno at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { detectLanguage, getLanguagePrompt } from "./languageDetector.ts";

// Deno ambient type for VS Code
declare const Deno: { env: { get(key: string): string | undefined } };

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "smartbiz_verify_token";

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

    // ─── 'Clear' Command Handler ─────────────────────────────────────────────
    if (text.trim().toLowerCase() === 'clear') {
      console.log(`[WEBHOOK] Clear command received from ${rawPhone}. Erasing chat memory.`);
      
      // Delete all messages for this lead to erase memory
      await supabase.from('messages').delete().eq('lead_id', lead.id);
      
      // Reset the lead profile fields that the AI collected
      await supabase.from('leads').update({
        interested_car: null,
        budget: null,
        status: 'New'
      }).eq('id', lead.id);

      await sendWhatsApp(rawPhone, "Your chat memory has been successfully cleared! Let me know how I can help you today. 🧹✨");
      return new Response("OK", { status: 200 });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Log the incoming message in 'messages' table
    await supabase.from('messages').insert({
      lead_id: lead.id,
      sender: 'customer',
      content: text
    });

    // ── Unconditional Test Drive Keyword Detection (Deno) ──
    if (detectTestDriveKeyword(text)) {
      await autoCreateTestDriveBooking(supabase, lead);
    }

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
    const mediaIdMap: Record<string, string> = {};

    if (settings.ai_enabled) {
      // ─── SMART AI RESPONDER FLOW ────────────────────────────────────
      console.log(`[WEBHOOK] AI enabled. Processing message for lead ${lead.id} using model ${settings.ai_model}...`);
      
      // Fetch active showroom inventory from Supabase db
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*');

      if (vehicles) {
        for (const v of vehicles) {
          if (v.image_url && v.whatsapp_main_media_id) {
            mediaIdMap[v.image_url] = v.whatsapp_main_media_id;
          }
          if (v.additional_images && v.whatsapp_additional_media_ids) {
            let addImages: string[] = [];
            try {
              addImages = typeof v.additional_images === 'string' ? JSON.parse(v.additional_images) : v.additional_images;
            } catch (e) {
              if (Array.isArray(v.additional_images)) addImages = v.additional_images;
            }
            
            let mediaIds: any = {};
            try {
              mediaIds = typeof v.whatsapp_additional_media_ids === 'string' ? JSON.parse(v.whatsapp_additional_media_ids) : v.whatsapp_additional_media_ids;
            } catch (e) {
              if (Array.isArray(v.whatsapp_additional_media_ids)) {
                v.whatsapp_additional_media_ids.forEach((id: string, idx: number) => {
                  if (addImages[idx]) {
                    mediaIds[addImages[idx]] = id;
                  }
                });
              }
            }

            if (mediaIds && typeof mediaIds === 'object' && !Array.isArray(mediaIds)) {
              for (const [imgUrl, mediaId] of Object.entries(mediaIds)) {
                mediaIdMap[imgUrl] = String(mediaId);
              }
            }
          }
        }
      }

      // Fetch last 6 messages for short-term history
      const { data: historyData } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(6);

      const chatHistory = (historyData || []).reverse();

      // Fetch existing test drive bookings for conversational memory
      const { data: bookingsData } = await supabase
        .from('test_drives')
        .select('*, vehicles(brand)')
        .eq('lead_id', lead.id)
        .order('booking_date', { ascending: false });

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
        supabaseClient: supabase,
        vehicles: vehicles || [],
        // Lead memory context
        leadName: lead.name,
        leadPhone: lead.phone,
        leadInterestedCar: lead.interested_car,
        leadBudget: lead.budget,
        leadBookings: bookingsData || []
      });

      outMsg = aiResult.reply;
      sendImageUrls = [];
      
      console.log(`[WEBHOOK] AI reply generated: "${outMsg}"`);
      console.log(`[WEBHOOK] send_photos_for_vehicle_id:`, aiResult.send_photos_for_vehicle_id);
      
      if (aiResult.send_photos_for_vehicle_id) {
        const targetId = Number(aiResult.send_photos_for_vehicle_id);
        let vehicle = (vehicles || []).find((v: any) => Number(v.id) === targetId);
        
        // Robust fallback: if not found by numeric ID, try matching by name/brand
        if (!vehicle && typeof aiResult.send_photos_for_vehicle_id === 'string') {
          const searchName = aiResult.send_photos_for_vehicle_id.toLowerCase().trim();
          vehicle = (vehicles || []).find((v: any) => 
            v.brand.toLowerCase().includes(searchName) || 
            searchName.includes(v.brand.toLowerCase())
          );
        }
        
        if (vehicle) {
          console.log(`[WEBHOOK] Found vehicle for photos: ${vehicle.brand} (ID: ${vehicle.id})`);
          if (vehicle.image_url) {
            try {
              const parsed = JSON.parse(vehicle.image_url);
              if (Array.isArray(parsed)) sendImageUrls.push(...parsed);
              else sendImageUrls.push(String(vehicle.image_url));
            } catch (e) {
              if (Array.isArray(vehicle.image_url)) sendImageUrls.push(...vehicle.image_url);
              else sendImageUrls.push(String(vehicle.image_url));
            }
          }
          if (vehicle.additional_images) {
            try {
              const parsedAdd = typeof vehicle.additional_images === 'string' ? JSON.parse(vehicle.additional_images) : vehicle.additional_images;
              if (Array.isArray(parsedAdd)) sendImageUrls.push(...parsedAdd);
            } catch (e) {}
          }
          console.log(`[WEBHOOK] Prepared ${sendImageUrls.length} images to send.`);
        } else {
          console.warn(`[WEBHOOK] No vehicle found matching send_photos_for_vehicle_id:`, aiResult.send_photos_for_vehicle_id);
        }
      }
      
      // Fallback if LLM outputs old structure
      if (aiResult.send_image_urls && Array.isArray(aiResult.send_image_urls)) {
        sendImageUrls.push(...aiResult.send_image_urls);
      }
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

        const debugMeta = {
          ...info,
          send_photos_for_vehicle_id: aiResult.send_photos_for_vehicle_id,
          send_image_urls: aiResult.send_image_urls,
          send_image_url: aiResult.send_image_url
        };
        updateObj.notes = `STATE:${JSON.stringify({ step: 'AI_AGENT', meta: debugMeta })}`;

        await supabase.from('leads').update(updateObj).eq('id', lead.id);
        console.log(`[WEBHOOK] Lead details updated:`, info);
        
        if (info.test_drive_booking && info.test_drive_booking.booked && info.test_drive_booking.vehicle_id && info.test_drive_booking.date_time) {
          try {
            // Check for existing whatsapp_auto entry to upgrade instead of duplicating
            const { data: autoEntries } = await supabase
              .from('test_drives')
              .select('id')
              .eq('lead_id', lead.id)
              .eq('source', 'whatsapp_auto')
              .limit(1);

            if (autoEntries && autoEntries.length > 0) {
              const { error: updErr } = await supabase
                .from('test_drives')
                .update({
                  vehicle_id: parseInt(info.test_drive_booking.vehicle_id, 10),
                  booking_date: info.test_drive_booking.date_time,
                  notes: "Confirmed via WhatsApp AI Agent",
                  updated_at: new Date().toISOString()
                })
                .eq('id', autoEntries[0].id);
              if (updErr) {
                console.error(`[WEBHOOK] Failed to upgrade auto test drive: ${updErr.message}`);
                outMsg = `⚠️ Sorry, there was an issue scheduling your test drive: ${updErr.message}. Could you please provide a different time or confirm the details?`;
              }
              else console.log(`[WEBHOOK] Test drive CONFIRMED and upgraded for lead ${lead.id}`);
            } else {
              const { error: tdErr } = await supabase.from('test_drives').insert({
                lead_id: lead.id,
                vehicle_id: parseInt(info.test_drive_booking.vehicle_id, 10),
                booking_date: info.test_drive_booking.date_time,
                notes: "Confirmed via WhatsApp AI Agent",
                status: "Scheduled"
              });
              if (tdErr) {
                console.error(`[WEBHOOK] Failed to book test drive: ${tdErr.message}`);
                outMsg = `⚠️ Sorry, there was an issue scheduling your test drive: ${tdErr.message}. Could you please provide a different time or confirm the details?`;
              }
              else console.log(`[WEBHOOK] Test drive booked for lead ${lead.id} on vehicle ${info.test_drive_booking.vehicle_id}`);
            }
          } catch (e: any) {
             console.error(`[WEBHOOK] Error inserting test drive: ${e.message}`);
             outMsg = `⚠️ Sorry, there was an issue scheduling your test drive: ${e.message}. Could you please provide a different time or confirm the details?`;
          }
        }

      } else {
        const debugMeta = {
          send_photos_for_vehicle_id: aiResult.send_photos_for_vehicle_id,
          send_image_urls: aiResult.send_image_urls,
          send_image_url: aiResult.send_image_url
        };
        await supabase.from('leads').update({
          notes: `STATE:${JSON.stringify({ step: 'AI_AGENT', meta: debugMeta })}`
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
    await sendWhatsApp(phone, outMsg, sendImageUrls, mediaIdMap);

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
  let apiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("OPENAI_API_KEY");
  console.log("API Key loaded. Starts with gsk_:", apiKey?.startsWith('gsk_'));

  if (!apiKey) {
    console.log("No API Key found, returning fallback.");
    return {
      reply: "Our sales team will get back to you shortly, or you can call us directly.",
      extracted_info: null
    };
  }

  try {
    const model = context.ai_model || 'openai/gpt-3.5-turbo';

    const detectedLang = detectLanguage(userMessage);
    const langInstructions = getLanguagePrompt(detectedLang);

    let systemContent = "";
    if (context.ai_bot_name) {
      systemContent = `You are ${context.ai_bot_name}, a helpful, polite, and ${context.ai_tone || 'professional'} sales representative at ${context.ai_dealership_name || 'Mohan Trading'}.
Greeting message (first thing you say to introduce yourself): "${context.ai_greeting_message || 'Hi!'}"

Detected Language of user's last message: ${detectedLang.toUpperCase()}
Language Instructions to apply (CRITICAL: Reply in the detected language style):
${langInstructions}

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
      systemContent = `You are an AI sales assistant for Mohan Trading, a premium car dealership in Sri Lanka. Be helpful, polite, and professional. Guide the customer through buying, selling, or booking test drives. Politely collect their name, interested car type, and budget range during the chat.

Detected Language of user's last message: ${detectedLang.toUpperCase()}
Language Instructions to apply (CRITICAL: Reply in the detected language style):
${langInstructions}`;
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
      let vehicles = context.vehicles;
      if (!vehicles && context.supabaseClient) {
        const { data, error } = await context.supabaseClient
          .from('vehicles')
          .select('*');
        if (!error && data) {
          vehicles = data;
        } else if (error) {
          console.error("Failed to fetch vehicles from Supabase:", error.message);
        }
      }
      
      if (vehicles) {
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
              const hasImages = allImages.length > 0;
              return `- ID: ${v.id} | Model: ${v.brand} | Price: LKR ${parseFloat(v.price).toLocaleString()} | Category: ${v.category} | Stock: ${v.stock}${v.description ? ` | Description: ${v.description}` : ''}${hasImages ? ` | Has Photos: Yes` : ` | Has Photos: No`}`;
            }).join('\n');
        } else {
          systemContent += "\n\nAvailable Showroom Inventory Stock: (Currently no vehicles in stock). Please inform the customer politely.";
        }
      }
    } catch (dbErr: any) {
      console.error("Failed to query vehicles in Deno:", dbErr.message || dbErr);
    }

    // Include current customer's profile and existing bookings to give the AI memory
    let customerContext = `\n\n[Current Customer Context / Profile]:
- Lead Name: "${context.leadName || 'WhatsApp User'}"
- Lead Phone: "${context.leadPhone || 'Unknown'}"
- Interested Car: "${context.leadInterestedCar || 'Not specified'}"
- Budget: "${context.leadBudget || 'Not specified'}"`;

    if (context.leadBookings && context.leadBookings.length > 0) {
      customerContext += `\n- Existing Test Drive Bookings (Memory):`;
      context.leadBookings.forEach((b: any, i: number) => {
        // Handle format of vehicles relationship brand in PostgREST vs pg rows
        const vehicleBrand = b.vehicles?.brand || b.vehicle_brand || 'Unknown';
        const dStr = new Date(b.booking_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        customerContext += `\n  ${i + 1}. [ID: ${b.id}] Vehicle: "${vehicleBrand}" | Scheduled Date/Time: "${dStr}" | Status: "${b.status}" | Notes: "${b.notes || 'None'}"`;
      });
      customerContext += `\n\nCRITICAL CONTEXTUAL RULE: If the customer references their existing booking (e.g. saying they already booked, or asking about their appointment), acknowledge it! Do NOT ask them for booking details again or attempt to create a new booking unless they specifically want to book another session or reschedule.`;
    } else {
      customerContext += `\n- Existing Test Drive Bookings: None`;
    }
    
    systemContent += customerContext;

    // Strict inventory booking and pricing rules
    systemContent += `\n\nCRITICAL INVENTORY & BOOKING RULE: You can ONLY book a test drive and return \`test_drive_booking.booked: true\` if the vehicle the customer requested is explicitly present in the 'Available Showroom Inventory Stock' list above. If the customer requests a vehicle that is not in the list, do NOT set \`booked: true\` and do NOT extract a vehicle ID. Instead, explain politely that we currently do not have that vehicle in stock, suggest one of our available options, and keep \`test_drive_booking.booked: false\`.
CRITICAL INSTRUCTION ON VEHICLE MATCHING & PRICING: Never hallucinate or invent vehicle brands, models, prices, or details. Refer ONLY to the provided 'Available Showroom Inventory Stock' list to check if a vehicle is in stock. Perform a flexible/fuzzy match (e.g. if the user asks for 'Ford Raptor' or 'Raptor' and we have 'Ford Raptor 2025' in stock, treat it as in-stock and confirm its availability). If a partial or fuzzy match exists in our inventory, enthusiastically confirm its availability using the exact model name from the inventory list in your reply. If no similar model is in stock, politely inform them that it is out of stock and suggest alternatives from the list. Do not make up names.
CRITICAL INSTRUCTION ON PHOTOS: If the user asks for photos, pictures, or images of a specific vehicle, YOU MUST return that vehicle's exact ID in the \`send_photos_for_vehicle_id\` field. NEVER say "Please bear with me for a moment" or "I've already sent them". Do NOT set this ID for other vehicles unless the user asked for them.
Conversely, if the user's latest incoming message does NOT explicitly request photos (e.g., asking about price, budget, fuel consumption, showroom location, or booking a test drive), you MUST keep \`send_photos_for_vehicle_id\` as null. Never send or repeat photos unless they are explicitly asked for in the current user message.\n`;

    // Include instructions for structured JSON output
    systemContent += `\n\n[Buffer Memory & Conversation Awareness]:
- CURRENT VEHICLE FOCUS: Always determine the vehicle the customer is currently talking about by reading the MOST RECENT messages in the conversation. Ignore the "Interested Car" profile field above if the chat has clearly moved to a different vehicle.
- If the user uses pronouns like "this", "it", or "that car", resolve it to the vehicle from the last 2-3 messages, not from old history.
- Speak naturally and conversationally like a human sales agent. NEVER narrate your internal database searches.
- Avoid contradictory statements. If you see the car in inventory, smoothly offer to book it.
- The current date and time is ${new Date().toISOString()}. Use this to resolve relative dates like "tomorrow" or "10 Jul" into strict ISO 8601 format strings.

[CONVERSATION-ENDING DETECTION — CRITICAL]:
- If the customer's message is a farewell, thank-you, or conversation closer (e.g., "okay thanks", "thank you", "thanks", "bye", "see you", "alright", "got it", "ok", "okay"), you MUST:
  1. Reply with a short, warm, friendly goodbye. Example: "You're welcome! See you on test drive day! 🚗 Feel free to message us anytime."
  2. Set send_photos_for_vehicle_id to null — NEVER send photos in a farewell response.
  3. Do NOT pitch any vehicles, suggest any actions, or mention any previous vehicles.
  4. Keep the reply to 1-2 sentences maximum.

CRITICAL INSTRUCTION ON PHOTOS: NEVER send photos unless the customer's current message contains an explicit photo request word: "show", "send", "photo", "picture", "image", "photos". ANY other message — including "okay", "okay thanks", "thanks", "yes", "yep", confirmations, goodbyes, booking requests — MUST have send_photos_for_vehicle_id as null.
CRITICAL INSTRUCTION: Respond ONLY with a valid raw JSON object. No markdown code blocks. No extra text.

JSON STRUCTURE — use EXACTLY this format with real values (not descriptions):
{
  "reply": "Great! I've booked your test drive for the Bentley 2025 on 10 July at 3:30 PM! ✅",
  "send_photos_for_vehicle_id": null,
  "extracted_info": {
    "name": "Customer Name",
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
- "reply": string — your natural language message to the customer. Do NOT include raw URLs (e.g. "/uploads/...") in your text reply. The system will automatically attach the photos for you.
- "send_photos_for_vehicle_id": INTEGER or null. Set this to the exact vehicle ID ONLY if customer explicitly asked for photos NOW. Otherwise, always null.
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
      // Force a supported Groq model
      if (finalModel !== 'llama-3.3-70b-versatile' && finalModel !== 'llama-3.1-8b-instant') {
        finalModel = 'llama-3.3-70b-versatile';
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

async function sendWhatsApp(to: string, text: string, imageUrls: string[] = [], mediaIdMap: Record<string, string> = {}): Promise<void> {
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
      const mediaId = mediaIdMap[url];

      if (mediaId) {
        console.log(`[sendWhatsApp] Found media ID mapping for ${url}: ${mediaId}`);
        payloads.push({
          messaging_product: "whatsapp",
          to: to,
          type: "image",
          image: {
            id: mediaId,
            caption: i === 0 ? text : "" // Only put text caption on the first image
          }
        });
        if (i === 0) sentText = true;
      } else {
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
      await new Promise(r => setTimeout(r, 1000)); // KEY FIX: 1 second delay between messages to prevent Meta silent drops
    }
  }
}

// ─── Test Drive Keyword Detection & Auto-Creation (Deno) ───────────────────
const TEST_DRIVE_KEYWORDS = [
  'test drive', 'test ride', 'test run', 'testdrive', 'testride',
  'test-drive', 'test-ride', 'trial drive', 'demo drive', 'demo ride',
  'try the car', 'try a car', 'drive the car', 'book a test',
  'schedule a test', 'want to test', 'like to test'
];

function detectTestDriveKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return TEST_DRIVE_KEYWORDS.some(kw => lower.includes(kw));
}

async function autoCreateTestDriveBooking(supabase: any, lead: any) {
  try {
    // Check if we already created one recently (within last 2 hours) to avoid duplicates
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('test_drives')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('source', 'whatsapp_auto')
      .gt('created_at', twoHoursAgo);

    if (existing && existing.length > 0) {
      console.log(`[TestDrive Auto Deno] Skipping duplicate - recent entry exists`);
      return;
    }

    // Try to find a matching vehicle
    let vehicleId = null;
    if (lead.interested_car) {
      const { data: matched } = await supabase
        .from('vehicles')
        .select('id')
        .ilike('brand', `%${lead.interested_car}%`)
        .gt('stock', 0)
        .limit(1);
      if (matched && matched.length > 0) vehicleId = matched[0].id;
    }

    // Fallback: any in-stock vehicle
    if (!vehicleId) {
      const { data: anyVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(1);
      if (anyVehicles && anyVehicles.length > 0) vehicleId = anyVehicles[0].id;
    }

    if (!vehicleId) {
      console.log(`[TestDrive Auto Deno] No in-stock vehicle found, skipping auto-booking`);
      return;
    }

    // Book 1 day from now as a placeholder
    const tentativeDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from('test_drives')
      .insert({
        lead_id: lead.id,
        vehicle_id: vehicleId,
        booking_date: tentativeDate,
        notes: 'Auto-detected via WhatsApp conversation — please confirm date & time with customer.',
        status: 'Scheduled',
        source: 'whatsapp_auto'
      });

    if (insertErr) {
      console.error(`[TestDrive Auto Deno] Failed to insert: ${insertErr.message}`);
    } else {
      console.log(`[TestDrive Auto Deno] Created pending test drive for lead ${lead.id} on vehicle ${vehicleId}`);
    }
  } catch (err: any) {
    console.error(`[TestDrive Auto Deno] Error: ${err.message}`);
  }
}

