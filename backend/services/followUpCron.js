const cron = require('node-cron');
const db = require('../db');
const { generateSmartReply } = require('./ai');
const { sendWhatsAppMessage } = require('./whatsapp');
const testDrivesRouter = require('../routes/test_drives');

// Follow-up limit configurations
const FOLLOW_UP_LIMITS = {
  '1 follow-up then stop': 1,
  '2 follow-ups then stop': 2,
  'Keep following up until replied': 999
};

// Wait time before triggering follow-up (in minutes)
const FOLLOW_UP_WAIT_MINUTES = 2; // Set to 2 minutes for quick testing!

async function runFollowUpJob() {
  console.log('[Cron] Running WhatsApp AI Follow-Up Check...');

  try {
    // 1. Sync test drives automatically in the background
    if (typeof testDrivesRouter.syncTestDrives === 'function') {
      await testDrivesRouter.syncTestDrives();
    }

    // Get settings
    const settingsRes = await db.query('SELECT * FROM settings WHERE id = 1');
    const settings = settingsRes.rows[0] || {};
    
    if (!settings.ai_enabled) {
      return;
    }

    const limitConfig = settings.ai_unanswered_limit || '1 follow-up then stop';
    const maxFollowUps = FOLLOW_UP_LIMITS[limitConfig] || 1;

    // Get active leads
    const leadsRes = await db.query(
      "SELECT * FROM leads WHERE status NOT IN ('Sold', 'Cold')"
    );

    for (const lead of leadsRes.rows) {
      // Get chat history for this lead
      const historyRes = await db.query(
        'SELECT sender, content, created_at FROM messages WHERE lead_id = $1 ORDER BY created_at ASC',
        [lead.id]
      );
      
      const chatHistory = historyRes.rows;
      if (chatHistory.length === 0) continue;

      const lastMessage = chatHistory[chatHistory.length - 1];

      // If the last message was NOT from the customer, and was from the bot
      if (lastMessage.sender === 'bot' || lastMessage.sender === 'assistant') {
        const lastMessageTime = new Date(lastMessage.created_at);
        const now = new Date();
        const diffMinutes = (now - lastMessageTime) / (1000 * 60);

        if (diffMinutes >= FOLLOW_UP_WAIT_MINUTES) {
          // Check how many follow-ups we have already sent consecutively
          let consecutiveBotMessages = 0;
          for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].sender === 'bot' || chatHistory[i].sender === 'assistant') {
              consecutiveBotMessages++;
            } else {
              break;
            }
          }

          // If the bot has already sent multiple messages without user reply, check limit
          // The first message is the actual reply. Consecutive messages after that are follow-ups.
          const followUpsSent = consecutiveBotMessages - 1; 

          if (followUpsSent < maxFollowUps) {
            console.log(`[Cron] Triggering follow-up for lead ${lead.id} (${lead.phone}). Waited ${Math.floor(diffMinutes)} mins.`);

            // Get test drive bookings for context
            const bookingsRes = await db.query(
              `SELECT td.*, v.brand as vehicle_brand 
               FROM test_drives td
               LEFT JOIN vehicles v ON td.vehicle_id = v.id
               WHERE td.lead_id = $1 
               ORDER BY td.booking_date DESC`,
              [lead.id]
            );

            // Create context for AI
            const context = {
              ai_system_prompt: settings.ai_system_prompt + `\n\nCRITICAL INSTRUCTION: The customer hasn't replied to your last message. Generate a short, friendly follow-up message based on the current context to re-engage them. Do not repeat your previous message. Keep it very brief and casual.`,
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
              ai_objections: settings.ai_objections,
              leadName: lead.name,
              leadPhone: lead.phone,
              leadInterestedCar: lead.interested_car,
              leadBudget: lead.budget,
              leadBookings: bookingsRes.rows
            };

            try {
              // Trigger AI
              const aiResult = await generateSmartReply("SYSTEM: The user hasn't replied. Please send a polite follow up message based on our chat history.", context);
              
              if (aiResult && aiResult.reply) {
                // Send WhatsApp Message
                await sendWhatsAppMessage(lead.phone, aiResult.reply, lead.id, 'bot');
                console.log(`[Cron] Follow-up sent to ${lead.phone}: ${aiResult.reply.substring(0, 30)}...`);
              }
            } catch (err) {
              console.error(`[Cron] Failed to send follow-up for lead ${lead.id}:`, err.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Cron] Error running follow-up job:', err);
  }
}

function initFollowUpCron() {
  console.log(`[Cron] Initializing Follow-Up Cron Job. Will check every minute (Wait time: ${FOLLOW_UP_WAIT_MINUTES} mins)`);
  // Run every minute to check if the wait time has elapsed for any lead
  cron.schedule('* * * * *', () => {
    runFollowUpJob();
  });
}

module.exports = {
  initFollowUpCron
};
