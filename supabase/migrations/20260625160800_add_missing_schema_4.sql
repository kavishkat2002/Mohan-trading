ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name character varying(255);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_type character varying(100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS chat_metadata jsonb DEFAULT '{}'::jsonb;
