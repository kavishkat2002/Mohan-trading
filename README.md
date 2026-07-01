# Mohan Traders CRM

Mohan Traders CRM is a premium, AI-powered automotive business management engine. It transforms traditional dealership operations into a high-efficiency digital ecosystem by integrating an **AI Sales Agent**, **WhatsApp Business API**, a **Node.js backend with PostgreSQL**, and **Real-time Lead Management**.

---

## 🚀 Key Features

- **Smart AI Sales Agent**: A fully integrated AI assistant powered by OpenRouter (Gemini/OpenAI/Llama). It acts as a digital sales representative, answering customer queries, providing vehicle details from live inventory, capturing lead information, booking test drives, and retaining conversation context using Buffer Memory.
- **Multi-Channel Lead Capture**: Automatically capture and organize leads from **WhatsApp** into a unified CRM registry.
- **Live WhatsApp Chat**: Seamlessly communicate with customers directly from the CRM using an integrated WhatsApp chat interface.
- **Vehicle Inventory Management**: A centralized hub to manage and track vehicle stock, upload vehicle images, manage technical details, and set AI guidelines per vehicle.
- **Role-Based Workspace**: Tailored interfaces and permissions for **Owners, Admins, Salespersons, and Accountants** to ensure secure and focused workflows.
- **Real-time Lead Assignment**: Instantly assign incoming leads to sales team members.
- **Financial & Commission Tracking**: Automatically calculate and record commissions upon closing deals, providing real-time financial transparency for owners and accountants.
- **Internal Noticeboard**: Keep the entire team aligned with pinned company announcements and real-time updates.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS, Shadcn UI
- **Animations**: Framer Motion for smooth transitions and a premium feel
- **Icons**: Lucide React
- **Data Fetching**: React Query, Axios

### Backend & Infrastructure
- **Server**: Node.js with Express.js
- **Database**: PostgreSQL (local database)
- **File Storage**: Local file system via `multer` (for vehicle images, logos, and avatars)
- **AI Integration**: OpenRouter API (`backend/services/ai.js`) for dynamic AI responses and smart replies.
- **Messaging Integration**: WhatsApp Business Platform (Meta Graph API via Webhooks)

---

## 🏗️ Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- PostgreSQL installed and running locally
- Meta Developer Account (WhatsApp Business API access)
- OpenRouter API Key (for the AI Sales Agent)

### 2. Project Setup

```bash
# Clone the repository
git clone https://github.com/kavishkat2002/smartbiz-ai-connect.git
cd smartbiz-ai-connect

# Install dependencies for both frontend and backend
npm install
cd backend && npm install
cd ..
```

### 3. Database Setup

Ensure PostgreSQL is running locally. You will need to create a database (e.g., `crm_db`) and run the initial migration scripts to set up the tables.

```bash
# Example using psql
psql -U postgres -d crm_db -f backend/init_db_full.sql
```

### 4. Environment Configuration

Create `.env` files in both the root directory (for frontend) and the `/backend` directory.

**Frontend (`/.env`)**:
```bash
VITE_API_URL="http://localhost:5001/api"
VITE_WHATSAPP_TOKEN="your-whatsapp-token"
VITE_PHONE_NUMBER_ID="your-phone-number-id"
```

**Backend (`/backend/.env`)**:
```bash
PORT=5001
DB_PORT=5432
JWT_SECRET="your-jwt-secret"
WHATSAPP_VERIFY_TOKEN="your-verify-token"
PHONE_NUMBER_ID="your-whatsapp-phone-id"
WHATSAPP_TOKEN="your-whatsapp-token"
WHATSAPP_BUSINESS_ACCOUNT_ID="your-business-account-id"

# AI Integration
OPENAI_API_KEY="your-openrouter-or-openai-api-key"
```

### 5. Running the Application

The project is configured to run both the Vite frontend and Node.js backend simultaneously from the root directory.

```bash
npm run dev
```

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5001

---

## 📦 Project Structure

- `/src`: Modular frontend application containing pages, components, context providers, and hooks.
  - `/src/pages`: Dashboard pages (Leads, Vehicles, Settings, etc.).
  - `/src/components`: Reusable UI components and layout structures.
- `/backend`: Node.js Express server.
  - `/backend/server.js`: Main entry point and Express configuration.
  - `/backend/routes`: API endpoints (`users.js`, `vehicles.js`, `webhook.js`, etc.).
  - `/backend/services`: Core services including `ai.js` (Smart Replies and Buffer Memory) and `whatsapp.js` (Meta Graph API).
  - `/backend/uploads`: Local storage directory for uploaded assets.

---

## 🤝 Contribution

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed & Designed by Creativex Lab**
*Driving Trust, Delivering Dreams.*
