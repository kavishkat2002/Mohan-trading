# Mohan Trader CRM (SmartBiz AI Connect)

Mohan Trader CRM is a premium, AI-powered automotive business management engine. It transforms traditional dealership operations into a high-efficiency digital ecosystem by integrating **WhatsApp Business API**, **Supabase**, and **Real-time Lead Management**.

---

## 🚀 Key Features

- **Multi-Channel Lead Capture**: Automatically capture and organize leads from **WhatsApp, Facebook, Instagram, and TikTok** into a unified registry.
- **Live WhatsApp Chat**: Seamlessly communicate with customers directly from the CRM using an integrated WhatsApp chat interface.
- **Vehicle Inventory Management**: A centralized hub to manage and track vehicle stock, technical details, and sales status.
- **Real-time Lead Assignment**: Instantly assign incoming leads to sales team members with automated notifications.
- **Financial & Commission Tracking**: Automatically calculate and record commissions upon closing deals, providing real-time financial transparency for owners and accountants.
- **Role-Based Workspace**: Tailored interfaces for **Owners, Admins, Salespersons, and Accountants** to ensure secure and focused workflows.
- **Internal Noticeboard**: Keep the entire team aligned with pinned company announcements and real-time updates.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS.
- **Animations**: Framer Motion for smooth transitions and high-end feel.
- **Icons**: Lucide Icons for a clean, modern UI.
- **Backend/Infrastructure**: Supabase (PostgreSQL), Edge Functions (Deno).
- **Messaging**: WhatsApp Business Platform (Meta Graph API).
- **Styling**: Custom Design System with a focus on "Automotive Elegance" (Inter typography, Slate/Primary color palette).

---

## 🏗️ Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Meta Developer Account (WhatsApp Business API access)

### 2. Project Setup

```bash
# Clone the repository
git clone https://github.com/kavishkat2002/smartbiz-ai-connect.git
cd smartbiz-ai-connect

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (for local frontend) and set your Supabase secrets:

```bash
# Frontend Env
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_WHATSAPP_TOKEN="your-permanent-api-token"
VITE_PHONE_NUMBER_ID="your-whatsapp-phone-id"

# Supabase Secrets
supabase secrets set WHATSAPP_TOKEN="..."
supabase secrets set PHONE_NUMBER_ID="..."
supabase secrets set VERIFY_TOKEN="..."
```

### 4. Deploying the WhatsApp Webhook

The core messaging logic resides in Supabase Edge Functions:

```bash
# Deploy the webhook
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

### 5. Running Locally

```bash
npm run dev
```

---

## 📦 Project Structure

- `/src/pages`: Modular dashboard pages (Leads, Vehicles, Finance, Chat, etc.).
- `/src/components`: Reusable UI components and the core `DashboardLayout`.
- `/supabase/functions/whatsapp-webhook`: Deno logic for handling incoming WhatsApp messages and lead creation.
- `/src/contexts`: Global state management for Authentication and Real-time data.

---

## 🤝 Contribution

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed & Designed by [Creativex Lab](#)**
*Driving Trust, Delivering Dreams.*
