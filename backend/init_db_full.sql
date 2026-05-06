-- Full Database Schema for Mohan Trader CRM

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'sales',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL UNIQUE,
  interested_car VARCHAR(255),
  budget VARCHAR(100),
  status VARCHAR(50) DEFAULT 'New',
  source VARCHAR(50) DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles (Inventory)
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(255) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  category VARCHAR(100),
  stock INT DEFAULT 1,
  description TEXT,
  image_url TEXT,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  transport_cost NUMERIC(12,2) DEFAULT 0,
  repair_cost NUMERIC(12,2) DEFAULT 0,
  registration_fee NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Sales
CREATE TABLE IF NOT EXISTS vehicle_sales (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  lead_id INT REFERENCES leads(id) ON DELETE SET NULL,
  selling_price NUMERIC(12,2) NOT NULL,
  sale_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Flow
CREATE TABLE IF NOT EXISTS cash_flow (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'Income' or 'Expense'
  account VARCHAR(50) DEFAULT 'Cash', -- 'Cash' or 'Bank'
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  check_in_lat FLOAT,
  check_in_lng FLOAT,
  check_out_lat FLOAT,
  check_out_lng FLOAT,
  UNIQUE(user_id, date)
);

-- Leaves
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50),
  start_date DATE,
  end_date DATE,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notices
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
