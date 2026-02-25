# ROX Chat - AI-Powered Website Chat Widget

Embeddable chat widget for ROX Heating & Air that connects to the AI conversation engine (`rox-ai-answering`) via HTTP API.

## Architecture

```
[Website Visitor] → [Chat Widget (JS)] → [rox-chat server] → HTTP → [rox-ai-answering engine]
                                                                            ↓
                                                                     [HousecallPro API]
```

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your ENGINE_API_URL
npm start
# Visit http://localhost:3001
```

## Embed on Any Website

```html
<script>
  window.ROX_CHAT_CONFIG = {
    serverUrl: "https://rox-chat-production.up.railway.app"
  };
</script>
<script data-no-optimize="1" src="https://rox-chat-production.up.railway.app/widget/chat-widget.js"></script>
```

**Note:** The `data-no-optimize="1"` attribute prevents SiteGround and similar optimizers from bundling the widget script (which breaks the config detection).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHAT_PORT` | Server port | `3001` |
| `ENGINE_API_URL` | rox-ai-answering API URL | `http://localhost:3000/api/engine` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `*` (all) |
| `NODE_ENV` | Environment | `development` |

## Multi-Tenant SaaS Roadmap

This project is architected for multi-tenant expansion:
- **Tenant ID** flows through every layer
- **Config** is swappable per tenant (branding, company info)
- **Sessions** are isolated per tenant
- **Engine connection** is per-tenant configurable

To scale: swap in-memory session store → Redis, add tenant database, and deploy per-tenant configs.
