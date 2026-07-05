const db = require('../db');

async function run() {
  console.log('[DB] Running AI settings migration...');
  try {
    // 1. Alter settings table to add columns
    await db.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT 'openai/gpt-3.5-turbo',
      ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT,
      ADD COLUMN IF NOT EXISTS ai_business_description TEXT,
      ADD COLUMN IF NOT EXISTS ai_faq_data JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('[DB] Settings table altered successfully.');

    // 2. Seed default values for Row 1
    const defaultPrompt = 'You are an AI sales assistant for Mohan Trading, a premium car dealership in Sri Lanka. Be helpful, polite, and professional. Guide the customer through buying, selling, or booking test drives. Politely collect their name, interested car type, and budget range during the chat.';
    const defaultDesc = 'Mohan Trading is a premium car dealership located in Colombo, Sri Lanka. We offer high-quality luxury cars, SUVs, and vans with warranty, flexible leasing partners, and a dedicated service station.';
    const defaultFaqs = JSON.stringify([
      { q: 'Where is Mohan Trading located?', a: 'We are located at Colombo, Sri Lanka.' },
      { q: 'What are your opening hours?', a: 'We are open Monday to Saturday from 9:00 AM to 6:00 PM.' },
      { q: 'Do you offer vehicle leasing?', a: 'Yes, we partner with all major Sri Lankan banks and leasing facilities to provide flexible financing options.' }
    ]);

    await db.query(`
      UPDATE settings 
      SET ai_enabled = COALESCE(ai_enabled, FALSE),
          ai_model = COALESCE(ai_model, 'openai/gpt-3.5-turbo'),
          ai_system_prompt = COALESCE(ai_system_prompt, $1),
          ai_business_description = COALESCE(ai_business_description, $2),
          ai_faq_data = COALESCE(ai_faq_data, $3::jsonb)
      WHERE id = 1;
    `, [defaultPrompt, defaultDesc, defaultFaqs]);

    console.log('[DB] Default settings values seeded successfully.');
  } catch (err) {
    console.error('[DB] Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
