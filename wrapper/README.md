# BolekCzat Wrapper

Thin Bolek-specific wrapper for LibreChat.

## Quick Start

```bash
npm install
npm run dev
```

Wrapper runs on http://localhost:3000
LibreChat runs on http://localhost:3090 (inside docker-compose)

## API Endpoints

All endpoints require Bearer token: `Authorization: Bearer test_token_for_dev`

### Send Message
```bash
POST /api/agent/message
Body: { message: string, conversationId?: string }
Response: { conversationId, assistantMessage, metadata }
```

### List Conversations
```bash
GET /api/agent/conversations
Response: { conversations: [...] }
```

### Get Conversation
```bash
GET /api/agent/conversations/:id
Response: { conversation, messages: [...] }
```

### Health Check
```bash
GET /health
```

## Architecture

```
BolekAI (orchestrator)
  ↓ (HTTP POST)
BolekCzat Wrapper (:3000)
  ├─ Translate Bolek format → LibreChat format
  ├─ Call LibreChat API (:3090)
  └─ Translate response back
  ↓
LibreChat (:3090)
  └─ Process chat, store conversations
```

## Files

- `src/index.ts` — Hono server with endpoints
- `src/adapter.ts` — LibreChat API translation
- `src/logger.ts` — Structured logging
- `src/types.ts` — TypeScript interfaces
- `docker-compose.yml` — Run both wrapper + LibreChat
- `package.json` — Dependencies

## Running

With Docker:
```bash
docker-compose up
```

Locally:
```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Integration with BolekAI

BolekAI calls this wrapper via HTTP:
- `POST http://localhost:3000/api/agent/message`
- Wrapper translates to LibreChat format
- Returns response in Bolek format

No direct calls from BolekAI to LibreChat.
