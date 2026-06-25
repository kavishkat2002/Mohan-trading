CREATE TABLE IF NOT EXISTS public.settings (
    id integer NOT NULL,
    name character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    business_type character varying(255),
    description text,
    bank_name character varying(255),
    bank_account_holder character varying(255),
    bank_account_number character varying(100),
    bank_branch character varying(255),
    bank_swift_code character varying(50),
    payment_gateway_name character varying(255),
    payment_gateway_link text,
    whatsapp_phone_number_id character varying(100),
    slogan character varying(255),
    logo_url text,
    whatsapp_token text,
    meta_app_id character varying(100),
    meta_config_id character varying(100),
    ai_enabled boolean DEFAULT false,
    ai_model character varying(100) DEFAULT 'openai/gpt-3.5-turbo'::character varying,
    ai_system_prompt text,
    ai_business_description text,
    ai_faq_data jsonb DEFAULT '[]'::jsonb,
    ai_bot_name character varying(255) DEFAULT 'Alex'::character varying,
    ai_dealership_name character varying(255) DEFAULT 'Mohan Trading'::character varying,
    ai_greeting_message text DEFAULT 'Hi! I''m Alex from AutoDrive Motors 👋 Looking for your dream car? Tell me what you have in mind!'::text,
    ai_tone character varying(255) DEFAULT 'Professional & warm'::character varying,
    ai_language character varying(255) DEFAULT 'English'::character varying,
    ai_emoji_usage character varying(255) DEFAULT 'Use emojis — feels friendly'::character varying,
    ai_ask_name_rule character varying(255) DEFAULT '3rd message'::character varying,
    ai_ask_budget_rule character varying(255) DEFAULT '3rd message'::character varying,
    ai_unanswered_limit character varying(255) DEFAULT '1 follow-up then stop'::character varying,
    ai_objections jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id integer NOT NULL,
    user_id text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    check_in_time timestamp without time zone,
    check_out_time timestamp without time zone,
    check_in_lat numeric(10,7),
    check_in_lng numeric(10,7),
    check_out_lat numeric(10,7),
    check_out_lng numeric(10,7),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id integer NOT NULL,
    assigned_to integer,
    created_by integer,
    vehicle_id integer,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    priority character varying(50) DEFAULT 'Medium'::character varying,
    due_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    task_type character varying(100) DEFAULT 'General'::character varying
);

CREATE TABLE IF NOT EXISTS public.notices (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    author_id text,
    author_name character varying(255),
    pinned boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url text
);


ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url character varying(255);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS additional_images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS supabase_id integer;
