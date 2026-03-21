// Deno ambient types for VS Code compatibility (Deno runtime resolves URL imports)
declare const Deno: {
  env: { get(key: string): string | undefined };
};

type ServeHandler = (req: Request) => Response | Promise<Response>;
declare function serve(handler: ServeHandler): void;

// @ts-ignore – resolved by Deno at runtime
const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

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

    if (!messages || messages.length === 0) {
      return new Response("No messages", { status: 200 });
    }

    const message = messages[0];
    const phone = message.from;
    const text = message.text?.body || "";
    
    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // State Management Logic (Car Sales Flow)
    // We can use a simple state check in the database or ignore for this simplified version
    // For now, let's just implement the primary capture or a simple welcome
    
    if (text.toLowerCase().includes("hi") || text.toLowerCase().includes("hello") || text.toLowerCase().includes("reset")) {
       await sendWhatsApp(phone, "Hi 👋 Welcome to Mohan Trading 🚗\n\nHow can we help you today?\n1. Buy a car\n2. Sell a car\n3. View available cars\n\n(Reply with 1, 2, or 3)");
    } else if (text === "1") {
       await sendWhatsApp(phone, "Great! What is your name?");
    } else if (text === "2") {
       await sendWhatsApp(phone, "We can help you sell. What is your name?");
    } else if (text === "3") {
       await sendWhatsApp(phone, "View our fleet here: https://mohantrading.com/vehicles");
    } else {
       // Placeholder for collecting details (In production use a 'conversation_state' table)
       await sendWhatsApp(phone, "Thanks! Our sales team will follow up with you shortly on WhatsApp. 🚗💨");
       
       // Log as a generic lead for now
       await supabase.from('leads').insert({
         name: "WhatsApp User",
         phone: phone,
         notes: `Last message: ${text}`,
         status: 'New'
       });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 200 }); // Always 200 for Meta
  }
});

async function sendWhatsApp(to: string, text: string): Promise<void> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("PHONE_NUMBER_ID");
  
  if (!token || !phoneId) return;

  await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: text }
    })
  });
}
