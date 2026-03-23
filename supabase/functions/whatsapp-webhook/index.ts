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
    const phone = message.from;
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

    // ─── AGENTIC CONVERSATION STATE MACHINE ───────────────────────────
    // State is stored in lead.notes as a simple JSON prefix
    let state = "GREETING";
    let metadata: Record<string, string> = {};

    // Parse current state from notes field
    try {
      if (lead.notes?.startsWith("STATE:")) {
        const stateData = JSON.parse(lead.notes.replace("STATE:", ""));
        state = stateData.step || "GREETING";
        metadata = stateData.meta || {};
      }
    } catch {
      state = "GREETING";
    }

    const inputLower = text.toLowerCase();
    let outMsg = "";
    let nextStep = state;

    // Global reset triggers
    if (["hi", "hello", "reset", "start", "menu"].includes(inputLower)) {
      nextStep = "GREETING";
    }

    switch (nextStep) {
      case "GREETING":
        outMsg = `Hi 👋 Welcome to *Mohan Trading* 🚗\n\nI am your AI Sales Assistant. How can I help you today?\n\n1️⃣ I want to *Buy* a car\n2️⃣ I want to *Sell* my car\n3️⃣ View latest *Inventory*\n\n(Reply with 1, 2, or 3)`;
        nextStep = "INTENT_DISCOVERY";
        break;

      case "INTENT_DISCOVERY":
        if (text === "1") {
          outMsg = "Exciting! 🚗 To find the perfect match for you, what *type of vehicle* are you looking for?\n\n(e.g., SUV, Sedan, Van, Pickup)";
          nextStep = "BUYER_VEHICLE_TYPE";
          metadata.intent = "BUY";
        } else if (text === "2") {
          outMsg = "We can help you sell! 💰 What is the *Make and Model* of your vehicle?\n\n(e.g., Toyota Aqua, Honda Vezel)";
          nextStep = "SELLER_MODEL";
          metadata.intent = "SELL";
        } else if (text === "3") {
          outMsg = "📋 Check out our latest vehicles here:\n🌐 https://mohantrading.lk/vehicles\n\nSee anything you like? Type *Buy* or reply *1* to proceed!";
          nextStep = "GREETING";
        } else {
          outMsg = "Sorry, I didn't get that 😅\n\nPlease reply with *1*, *2*, or *3* to continue.";
        }
        break;

      case "BUYER_VEHICLE_TYPE":
        metadata.vehicle_type = text;
        outMsg = `Got it — a *${text}*! 🚗\n\nWhat is your *approximate budget*?\n\n(e.g., 10M - 15M LKR)`;
        nextStep = "BUYER_BUDGET";
        break;

      case "BUYER_BUDGET":
        metadata.budget = text;
        // Update lead record with collected info
        await supabase.from('leads').update({
          interested_car: metadata.vehicle_type || null,
          budget: text,
          status: "Hot"
        }).eq('id', lead.id);

        outMsg = `Thank you! 🎉\n\nI'm searching our inventory for the best *${metadata.vehicle_type}* within *${text}*.\n\nOne of our sales specialists will contact you shortly with personalized options! 🚗💨\n\n_Type *menu* anytime to start over._`;
        nextStep = "COMPLETED";
        break;

      case "SELLER_MODEL":
        metadata.sell_model = text;
        // Update lead record
        await supabase.from('leads').update({
          interested_car: `SELL: ${text}`,
          status: "Warm"
        }).eq('id', lead.id);

        outMsg = `Thanks for sharing! 📝\n\nWe've noted your *${text}* for sale. Our team will evaluate it and reach out to you with a fair offer soon! 💰\n\n_Type *menu* anytime to start over._`;
        nextStep = "COMPLETED";
        break;

      case "COMPLETED":
        outMsg = `Our team has already been notified and will contact you soon! 🚗\n\n_Type *menu* or *hi* to restart the conversation._`;
        break;

      default:
        outMsg = `Hi 👋 Welcome to *Mohan Trading* 🚗\n\nI am your AI Sales Assistant. How can I help you today?\n\n1️⃣ I want to *Buy* a car\n2️⃣ I want to *Sell* my car\n3️⃣ View latest *Inventory*\n\n(Reply with 1, 2, or 3)`;
        nextStep = "INTENT_DISCOVERY";
    }

    // Save updated state to lead notes
    const { error: stateErr } = await supabase.from('leads').update({
      notes: `STATE:${JSON.stringify({ step: nextStep, meta: metadata })}`
    }).eq('id', lead.id);
    if (stateErr) console.error("[WEBHOOK] State save error:", stateErr.message);

    // Log outbound message
    await supabase.from('messages').insert({
      lead_id: lead.id,
      sender: 'bot',
      content: outMsg
    });

    // Send WhatsApp reply
    await sendWhatsApp(phone, outMsg);

    console.log(`[WEBHOOK] Replied to ${phone}, next step: ${nextStep}`);
    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("[WEBHOOK ERROR]", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
});

async function sendWhatsApp(to: string, text: string): Promise<void> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("PHONE_NUMBER_ID");

  if (!token || !phoneId) {
    console.error("[sendWhatsApp] Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID");
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    })
  });

  const resJson = await res.json();
  if (!res.ok) {
    console.error("[sendWhatsApp] Meta API error:", JSON.stringify(resJson));
  } else {
    console.log("[sendWhatsApp] Sent OK to", to, "| msgId:", resJson?.messages?.[0]?.id);
  }
}
