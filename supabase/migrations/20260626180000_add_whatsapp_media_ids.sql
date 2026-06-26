ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS whatsapp_main_media_id text DEFAULT ''::text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS whatsapp_additional_media_ids jsonb DEFAULT '[]'::jsonb;
