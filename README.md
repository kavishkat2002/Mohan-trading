# SmartBiz AI Connect - WhatsApp Sales Agent

An intelligent, AI-powered WhatsApp Sales Agent designed specifically for automotive dealerships. This project handles incoming customer inquiries, checks live vehicle inventory, manages test drive bookings, and provides smart conversational responses directly through WhatsApp.

---

## 🚀 Key Features

- **Smart AI Sales Agent**: Powered by OpenRouter (Gemini/OpenAI/Llama), this agent acts as a digital sales representative. It answers customer queries, provides vehicle details from live inventory, captures lead information, and handles test drive bookings.
- **Context-Aware Memory**: Utilizes Buffer Memory and Summary Memory to remember the specific vehicle or topic a customer is focused on throughout the conversation, ensuring natural and accurate responses (e.g., when a user asks for "photos of this").
- **WhatsApp Business Integration**: Directly integrated with the Meta Graph API via webhooks to instantly receive and reply to WhatsApp messages.
- **Dynamic Inventory Awareness**: The AI reads from a live PostgreSQL database to offer real-time stock availability, pricing, and vehicle specifications to customers.
- **Automated Media Handling**: The agent can automatically send vehicle images (stored locally) directly to the customer's WhatsApp when requested.

---

## 🛠️ Tech Stack

### Core Technologies
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (local database)
- **AI Integration**: OpenRouter API (`backend/services/ai.js`) for NLP and conversational logic.
- **Messaging Integration**: WhatsApp Business Platform (Meta Graph API).
- **File Storage**: Local file system via `multer` for hosting and serving vehicle images.

---

## 🏗️ Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- PostgreSQL installed and running locally
- Meta Developer Account (for WhatsApp Business API access and Webhook configuration)
- OpenRouter API Key (for the AI models)

### 2. Project Setup

```bash
# Clone the repository
git clone https://github.com/kavishkat2002/smartbiz-ai-connect.git
cd smartbiz-ai-connect

# Install dependencies for the backend
cd backend
npm install
```

### 3. Database Setup

Ensure PostgreSQL is running locally. You will need to create a database (e.g., `crm_db`) and run the initial migration scripts to set up the inventory tables.

```bash
# Connect to PostgreSQL and run the SQL script
psql -U postgres -d crm_db -f init_db_full.sql
```

### 4. Environment Configuration

Create a `.env` file in the `/backend` directory to configure your API keys and database connection.

**Backend (`/backend/.env`)**:
```bash
PORT=5001
DB_PORT=5432

# WhatsApp Business API Credentials
WHATSAPP_VERIFY_TOKEN="your-custom-webhook-verify-token"
PHONE_NUMBER_ID="your-whatsapp-phone-id"
WHATSAPP_TOKEN="your-whatsapp-permanent-token"
WHATSAPP_BUSINESS_ACCOUNT_ID="your-business-account-id"

# AI Integration
OPENAI_API_KEY="your-openrouter-or-openai-api-key"
```

### 5. Running the Agent

Start the Node.js server. The server will listen for incoming WhatsApp webhooks and process AI responses.

```bash
npm run dev
```

Your API will be running on `http://localhost:5001`. Ensure your server is publicly accessible (e.g., via ngrok) so Meta can deliver webhook events to `http://<your-domain>/api/webhook`.

---

## 📦 Core Project Structure

- `/backend/server.js`: Main entry point, configures Express and mounts the webhook routes.
- `/backend/routes/webhook.js`: Handles the incoming POST requests from Meta's WhatsApp API.
- `/backend/services/ai.js`: Contains the core logic for constructing the AI's prompt, injecting live inventory data, enforcing memory rules, and parsing the JSON response.
- `/backend/services/whatsapp.js`: Handles formatting and dispatching outgoing messages (text and media) back to the WhatsApp Graph API.

---

## 🤝 Contribution

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed & Designed by Creativex Lab**
*Driving Trust, Delivering Dreams.*
