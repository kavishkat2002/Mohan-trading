
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_number character varying(255);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS ai_notes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to_name character varying(255);
