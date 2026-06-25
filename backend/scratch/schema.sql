--
-- PostgreSQL database dump
--

\restrict 50ypmnvUTYDUgWfgtN3MRWyeTKcuGwbTKR1heCvYRkMMHJJFxwG1MtTFmqaBj4I

-- Dumped from database version 15.17 (Homebrew)
-- Dumped by pg_dump version 15.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.attendance (
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


ALTER TABLE public.attendance OWNER TO kavishkathilakarathna;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: cash_flow; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.cash_flow (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    account character varying(50) DEFAULT 'Cash'::character varying NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cash_flow_type_check CHECK (((type)::text = ANY ((ARRAY['Income'::character varying, 'Expense'::character varying])::text[])))
);


ALTER TABLE public.cash_flow OWNER TO kavishkathilakarathna;

--
-- Name: cash_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.cash_flow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cash_flow_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: cash_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.cash_flow_id_seq OWNED BY public.cash_flow.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    category character varying(100) NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    date date DEFAULT CURRENT_DATE,
    account character varying(50) DEFAULT 'Cash'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expenses OWNER TO kavishkathilakarathna;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expenses_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    interested_car character varying(255),
    budget character varying(100),
    status character varying(50) DEFAULT 'New'::character varying,
    source character varying(50) DEFAULT 'manual'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    current_step character varying(100) DEFAULT 'START'::character varying,
    chat_metadata jsonb DEFAULT '{}'::jsonb,
    assigned_to text,
    assigned_to_name character varying(255),
    commission_amount numeric(12,2) DEFAULT 0
);


ALTER TABLE public.leads OWNER TO kavishkathilakarathna;

--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leads_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: leaves; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.leaves (
    id integer NOT NULL,
    user_id text NOT NULL,
    leave_type character varying(100) DEFAULT 'Annual'::character varying NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.leaves OWNER TO kavishkathilakarathna;

--
-- Name: leaves_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.leaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leaves_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: leaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.leaves_id_seq OWNED BY public.leaves.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    lead_id integer,
    sender character varying(50) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    supabase_id integer
);


ALTER TABLE public.messages OWNER TO kavishkathilakarathna;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.messages_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notices; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.notices (
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


ALTER TABLE public.notices OWNER TO kavishkathilakarathna;

--
-- Name: notices_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.notices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notices_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: notices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.notices_id_seq OWNED BY public.notices.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id text,
    message text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO kavishkathilakarathna;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.settings (
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


ALTER TABLE public.settings OWNER TO kavishkathilakarathna;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.settings_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.tasks (
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


ALTER TABLE public.tasks OWNER TO kavishkathilakarathna;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tasks_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tenant_subscription; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.tenant_subscription (
    id integer NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '30 days'::interval),
    plan_type character varying(50) DEFAULT 'Starter'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenant_subscription OWNER TO kavishkathilakarathna;

--
-- Name: tenant_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.tenant_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tenant_subscription_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: tenant_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.tenant_subscription_id_seq OWNED BY public.tenant_subscription.id;


--
-- Name: test_drives; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.test_drives (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    vehicle_id integer NOT NULL,
    booking_date timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'Scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.test_drives OWNER TO kavishkathilakarathna;

--
-- Name: test_drives_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.test_drives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.test_drives_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: test_drives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.test_drives_id_seq OWNED BY public.test_drives.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'sales'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255),
    mobile_number character varying(50),
    avatar_url text,
    supabase_uid character varying(255)
);


ALTER TABLE public.users OWNER TO kavishkathilakarathna;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicle_sales; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.vehicle_sales (
    id integer NOT NULL,
    vehicle_id integer,
    lead_id integer,
    selling_price numeric(15,2) NOT NULL,
    sale_date date DEFAULT CURRENT_DATE,
    payment_method character varying(50) DEFAULT 'Bank'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vehicle_sales OWNER TO kavishkathilakarathna;

--
-- Name: vehicle_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.vehicle_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vehicle_sales_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: vehicle_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.vehicle_sales_id_seq OWNED BY public.vehicle_sales.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: kavishkathilakarathna
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    brand character varying(255) NOT NULL,
    price numeric(15,2) DEFAULT 0 NOT NULL,
    category character varying(100),
    stock integer DEFAULT 1,
    description text,
    image_url text,
    purchase_price numeric(15,2) DEFAULT 0,
    transport_cost numeric(15,2) DEFAULT 0,
    repair_cost numeric(15,2) DEFAULT 0,
    registration_fee numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fuel_type character varying(20) DEFAULT 'Petrol'::character varying,
    ai_notes text DEFAULT ''::text,
    additional_images jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.vehicles OWNER TO kavishkathilakarathna;

--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: kavishkathilakarathna
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vehicles_id_seq OWNER TO kavishkathilakarathna;

--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kavishkathilakarathna
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: cash_flow id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.cash_flow ALTER COLUMN id SET DEFAULT nextval('public.cash_flow_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: leaves id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.leaves ALTER COLUMN id SET DEFAULT nextval('public.leaves_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notices id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.notices ALTER COLUMN id SET DEFAULT nextval('public.notices_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tenant_subscription id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tenant_subscription ALTER COLUMN id SET DEFAULT nextval('public.tenant_subscription_id_seq'::regclass);


--
-- Name: test_drives id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.test_drives ALTER COLUMN id SET DEFAULT nextval('public.test_drives_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicle_sales id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.vehicle_sales ALTER COLUMN id SET DEFAULT nextval('public.vehicle_sales_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_date_key UNIQUE (user_id, date);


--
-- Name: cash_flow cash_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.cash_flow
    ADD CONSTRAINT cash_flow_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: leads leads_phone_key; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_phone_key UNIQUE (phone);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leaves leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: messages messages_supabase_id_key; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_supabase_id_key UNIQUE (supabase_id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tenant_subscription tenant_subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tenant_subscription
    ADD CONSTRAINT tenant_subscription_pkey PRIMARY KEY (id);


--
-- Name: test_drives test_drives_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.test_drives
    ADD CONSTRAINT test_drives_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_supabase_uid_key; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_supabase_uid_key UNIQUE (supabase_uid);


--
-- Name: vehicle_sales vehicle_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.vehicle_sales
    ADD CONSTRAINT vehicle_sales_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: messages messages_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: test_drives test_drives_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.test_drives
    ADD CONSTRAINT test_drives_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: test_drives test_drives_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.test_drives
    ADD CONSTRAINT test_drives_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_sales vehicle_sales_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.vehicle_sales
    ADD CONSTRAINT vehicle_sales_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: vehicle_sales vehicle_sales_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kavishkathilakarathna
--

ALTER TABLE ONLY public.vehicle_sales
    ADD CONSTRAINT vehicle_sales_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 50ypmnvUTYDUgWfgtN3MRWyeTKcuGwbTKR1heCvYRkMMHJJFxwG1MtTFmqaBj4I

