-- =====================================================
-- FULL SCHEMA: All missing tables for Mohan Trading CRM
-- =====================================================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add missing columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_step VARCHAR(100) DEFAULT 'START';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS chat_metadata JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New';

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(255) NOT NULL,
  price NUMERIC(15,2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  stock INT DEFAULT 1,
  description TEXT,
  image_url TEXT,
  purchase_price NUMERIC(15,2) DEFAULT 0,
  transport_cost NUMERIC(15,2) DEFAULT 0,
  repair_cost NUMERIC(15,2) DEFAULT 0,
  registration_fee NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Sales table
CREATE TABLE IF NOT EXISTS vehicle_sales (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
  selling_price NUMERIC(15,2) NOT NULL,
  sale_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'Bank',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table (operational costs)
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  account VARCHAR(50) DEFAULT 'Cash',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Flow table
CREATE TABLE IF NOT EXISTS cash_flow (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Income', 'Expense')),
  account VARCHAR(50) NOT NULL DEFAULT 'Cash',
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  check_in_lat NUMERIC(10,7),
  check_in_lng NUMERIC(10,7),
  check_out_lat NUMERIC(10,7),
  check_out_lng NUMERIC(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(100) NOT NULL DEFAULT 'Annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notices (Noticeboard) table
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  assigned_to INT REFERENCES users(id) ON DELETE CASCADE,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  priority VARCHAR(50) DEFAULT 'Medium',
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  name VARCHAR(255) DEFAULT 'Mohan Trading',
  contact_email VARCHAR(255) DEFAULT 'tkavishka101@gmail.com',
  contact_phone VARCHAR(50) DEFAULT '',
  business_type VARCHAR(100) DEFAULT 'other',
  description TEXT DEFAULT '',
  bank_name VARCHAR(255) DEFAULT '',
  bank_account_holder VARCHAR(255) DEFAULT '',
  bank_account_number VARCHAR(100) DEFAULT '',
  bank_branch VARCHAR(255) DEFAULT '',
  bank_swift_code VARCHAR(50) DEFAULT '',
  payment_gateway_name VARCHAR(255) DEFAULT '',
  payment_gateway_link TEXT DEFAULT '',
  whatsapp_phone_number_id VARCHAR(100) DEFAULT '1059367357255730',
  slogan VARCHAR(255) DEFAULT 'Delivering Dreams, Driving Trust',
  logo_url TEXT DEFAULT '/mohantrader-logo.png',
  whatsapp_token TEXT DEFAULT '',
  meta_app_id VARCHAR(100) DEFAULT '',
  meta_config_id VARCHAR(100) DEFAULT '',
  ai_enabled BOOLEAN DEFAULT FALSE,
  ai_model VARCHAR(100) DEFAULT 'openai/gpt-3.5-turbo',
  ai_system_prompt TEXT DEFAULT 'You are an AI sales assistant for Mohan Trading, a premium car dealership in Sri Lanka. Be helpful, polite, and professional. Guide the customer through buying, selling, or booking test drives. Politely collect their name, interested car type, and budget range during the chat.',
  ai_business_description TEXT DEFAULT 'Mohan Trading is a premium car dealership located in Colombo, Sri Lanka. We offer high-quality luxury cars, SUVs, and vans with warranty, flexible leasing partners, and a dedicated service station.',
  ai_faq_data JSONB DEFAULT '[]'::jsonb
);

-- Seed setting row 1 if not exists
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

