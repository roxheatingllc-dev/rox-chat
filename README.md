# ROX Chat - AI Website Chatbot

Website chat widget powered by the same AI conversation engine as the phone system. Customers can schedule repairs, get estimates, and manage appointments directly from your website.

## How It Works

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Chat Widget │────▶│  Chat Server     │────▶│  Conversation       │
│  (Browser)   │◀────│  (Express API)   │◀────│  Manager (Engine)   │
│              │     │                  │     │                     │
│  - Bubble UI │     │  - Sessions      │     │  - Same brain as    │
│  - Messages  │     │  - Chat Adapter  │     │    phone system     │
│  - Buttons   │     │  - Rate Limiting │     │  - HCP Integration  │
│  - History   │     │  - Tenant Config │     │  - Tech Routing     │
└──────────────┘     └──────────────────┘     └─────────────────────┘
```

**Same brain, new channel.** The phone system's ConversationManager handles all the logic — this project just adds a web chat interface on top.

## Quick Start

### 1. Install & Configure

```bash
cd rox-chat
npm install

# Create your environment file
cp .env.example .env

# IMPORTANT: Set the path to your existing rox-ai-answering project
# Edit .env and set:
#   ROX_ENGINE_PATH=../rox-ai-answering
#   HOUSECALL_PRO_API_KEY=your_key_here
```

### 2. Run the Server

```bash
npm start
```

### 3. Test the Widget

Open [http://localhost:3001](http://localhost:3001) to see the demo page with the chat widget.

Click the red chat bubble in the bottom-right corner!

## Add to Your Website

Add this single line before `</body>` on any page:

```html
<script 
  src="https://your-server.com/widget/chat-widget.js" 
  data-tenant="rox-heating"
  data-server="https://your-server.com"
  data-color="#E63946">
</script>
```

That's it. The widget handles everything else automatically.

### Embed Options

| Attribute | Description | Default |
|-----------|-------------|---------|
| `data-tenant` | Tenant ID (for multi-tenant SaaS) | `rox-heating` |
| `data-server` | Chat server URL | Current domain |
| `data-color` | Primary color (hex) | `#E63946` |
| `data-secondary` | Secondary color (hex) | `#1D3557` |
| `data-position` | Widget position | `bottom-right` |

## Project Structure

```
rox-chat/
├── chat-server.js              # Express server (standalone or mountable)
├── config/
│   ├── chat-config.js          # Tenant config & widget settings
│   └── quick-replies.js        # State → button mapping (hybrid UX)
├── services/
│   ├── chat-adapter.js         # Bridges ConversationManager ↔ Chat
│   └── chat-session-store.js   # Session management (in-memory → DB)
├── routes/
│   └── chat-routes.js          # REST API endpoints
├── widget/
│   └── chat-widget.js          # Embeddable browser widget (vanilla JS)
├── public/
│   └── demo.html               # Demo website with widget embedded
├── tests/
│   └── test-chat-flow.js       # Integration tests
├── .env.example                # Environment template
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/start` | Start a new chat session |
| `POST` | `/api/chat/message` | Send a message |
| `GET` | `/api/chat/session?sessionId=xxx` | Get session state & history |
| `POST` | `/api/chat/end` | End a chat session |
| `GET` | `/api/chat/config` | Get widget config (for dynamic loading) |
| `GET` | `/api/chat/health` | Health check with active session count |

## Integration with Existing Phone System

The chat widget reuses your existing `rox-ai-answering` project as the conversation engine. Set `ROX_ENGINE_PATH` in `.env` to point to it.

**Alternatively**, mount the chat routes in your existing `server.js`:

```javascript
// In your existing server.js, add:
const chatRoutes = require('./rox-chat/routes/chat-routes');
app.use('/api/chat', chatRoutes);
app.use(express.static('./rox-chat/public'));
```

## Chat Flow (vs Phone)

The chat flow is nearly identical to the phone flow, with these differences:

| Feature | Phone (Vapi) | Chat (Widget) |
|---------|-------------|---------------|
| Customer ID | Caller ID lookup | Phone number input |
| Responses | Voice (TTS) | Text + buttons |
| Pronunciation | "Rocks" for TTS | "ROX" (correct) |
| Input | Speech-to-text | Type or tap buttons |
| Session | Call duration | 30-min timeout |
| Quick options | None (voice only) | Button shortcuts |

## Multi-Tenant SaaS Roadmap

This codebase is architected for multi-tenant expansion:

### What's Already Multi-Tenant Ready
- ✅ Tenant ID flows through every request
- ✅ Config is tenant-scoped (just swap the data source)
- ✅ Sessions are keyed by tenant + session ID
- ✅ Widget accepts tenant ID via embed attribute
- ✅ CORS supports per-tenant origin lists
- ✅ Quick replies configurable per tenant/industry

### What to Add for SaaS
1. **Database** - Move tenant configs from `chat-config.js` to PostgreSQL/MongoDB
2. **Redis Sessions** - Swap `InMemoryStore` for Redis in `chat-session-store.js`
3. **Auth/Admin** - Tenant dashboard to manage config, view analytics
4. **Billing** - Stripe integration for per-tenant billing
5. **Custom Engines** - Each tenant connects their own CRM (HCP, ServiceTitan, etc.)
6. **CDN Widget** - Serve widget JS from CDN with tenant-specific config injection

### Target Industries
HVAC, Plumbing, Electrical, Garage Doors, Handyman, Cleaning, Pest Control

---

**Version:** 1.0.0  
**Date:** February 2026  
