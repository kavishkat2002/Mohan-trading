-- Migration to support 3-Tier Agentic Memory for WhatsApp AI Bot

-- 1. Support for Relational Memory (Tier 2) on Customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lead_summary TEXT, -- Stores a quick summary of the lead's history
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT now();

-- 2. Ensure Conversations table is ready for Contextual Memory (Tier 1)
-- metadata column already exists, but we'll add a current_step for faster queries if needed
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'GREETING',
ADD COLUMN IF NOT EXISTS last_node_at TIMESTAMPTZ DEFAULT now();

-- 3. Add Index for performance on phone lookups (since WhatsApp uses phone numbers)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
