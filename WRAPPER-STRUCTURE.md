# BolekCzat Wrapper — Structure & Architecture

> BolekCzat is a **thin wrapper** around LibreChat (forked, unmodified).
> The wrapper exposes Bolek-specific API endpoints and adapts between Bolek orchestrator and LibreChat.

---

## Directory Structure

```
BolekCzat/
├── fork/                          # LibreChat fork (unmodified)
│   ├── api/
│   ├── client/
│   ├── packages/
│   └── docker-compose.yml         # For LibreChat only
│
├── src/                           # Wrapper (TypeScript/Node.js)
│   ├── index.ts                   # Entry point, Hono app
│   ├── adapter.ts                 # Translate between Bolek ↔ LibreChat
│   ├── types.ts                   # Wrapper-specific types
│   └── logger.ts                  # Structured logging
│
├── docker-compose.yml             # Runs both: wrapper + LibreChat fork
├── package.json                   # Wrapper dependencies (Hono, etc.)
├── WRAPPER-SETUP.md               # How to run wrapper
└── fork-README.md                 # Original LibreChat README (reference)
```

---

## Wrapper Responsibilities

**The wrapper:**
- ✅ Listens on `:3000` (Bolek-facing)
- ✅ Calls LibreChat internally (on `:3090`)
- ✅ Implements Bolek API contract (POST /api/agent/message, etc.)
- ✅ Translates Bolek format ↔ LibreChat format
- ✅ Handles auth (Bearer token)
- ✅ Logs all requests with structured logging

**LibreChat (fork) does:**
- ✅ Runs on `:3090` (wrapper-facing)
- ✅ Stores conversations
- ✅ Renders UI (optional — not needed for Bolek)
- ✅ Stays completely unmodified

---

## API Endpoints

### Wrapper (Bolek-facing) — Port 3000

```
POST /api/agent/message
  Input: { message: string, conversationId?: string }
  Output: { conversationId: string, response: string, metadata: {...} }
  Auth: Bearer token

GET /api/agent/conversations
  Input: (none)
  Output: { conversations: [...] }
  Auth: Bearer token

GET /api/agent/conversations/:id
  Input: conversationId in path
  Output: { conversation: {...}, messages: [...] }
  Auth: Bearer token
```

### LibreChat (fork-facing) — Port 3090

```
POST /api/chat
  (LibreChat native endpoint — wrapper calls this)

GET /api/conversations
  (LibreChat native endpoint — wrapper adapts response)
```

---

## Implementation Phases

### Phase 1: Wrapper Scaffold
- Create `src/index.ts` with Hono server
- Create `docker-compose.yml` that starts both wrapper + fork
- Wrapper listens on :3000, calls fork on :3090

### Phase 2: Adapter Layer
- Create `src/adapter.ts`
- Implement message → LibreChat translation
- Implement response ← LibreChat translation

### Phase 3: Bolek API Endpoints
- POST /api/agent/message (send message, get response)
- GET /api/agent/conversations (list all)
- GET /api/agent/conversations/:id (get one with history)

### Phase 4: Testing & Polish
- Unit tests for adapter
- Error handling (LibreChat down, timeout, etc.)
- Logging for debugging

---

## Key Design Decisions

### Why separate processes?
- **LibreChat fork is unmodified** → easy to upgrade upstream
- **Wrapper is pure Bolek logic** → testable independently
- **Clear separation** → wrapper ≤ 500 lines TS

### Why Hono?
- **Lightweight** (used in BolekAI)
- **TypeScript native**
- **Cloudflare-ready** (if wrapper moves to Workers later)

### Why Adapter pattern?
- **Bolek ↔ LibreChat format mismatch** → adapter handles it
- **Testable in isolation**
- **Easy to extend**

---

## Communication Flow

```
BolekAI (orchestrator)
  ↓ (HTTP POST)
  BolekCzat Wrapper (:3000)
    ├─ Receive Bolek-format message
    ├─ Translate to LibreChat format
    ├─ Call LibreChat API (:3090)
    ├─ Receive LibreChat response
    ├─ Translate back to Bolek format
    └─ Return to BolekAI
  ↓
  LibreChat Fork (:3090)
    ├─ Process message
    ├─ Store in MongoDB
    └─ Return response
```

---

## Development Workflow

### Local Development

```bash
# 1. Start both wrapper + fork
docker-compose up

# 2. In another terminal, test wrapper
curl -X POST http://localhost:3000/api/agent/message \
  -H "Authorization: Bearer test_token" \
  -d '{"message":"Hello","conversationId":"conv_123"}'

# 3. Wrapper calls fork internally
# (Fork is on localhost:3090)

# 4. Watch logs
docker-compose logs -f wrapper
```

### Modifying Wrapper
- Only modify `src/` files
- Restart wrapper: `docker-compose restart wrapper`
- Fork auto-restarts on any changes (if running in dev mode)

### Modifying Fork
- Modify `fork/` files
- Rebuild: `docker-compose build librechat`
- Restart: `docker-compose restart librechat`

---

## Environment Variables

### Wrapper (.env)
```env
NODE_ENV=development
LOG_LEVEL=info
BOLEK_API_TOKEN=test_token_for_dev
LIBRECHAT_URL=http://librechat:3090  # Internal docker network
WRAPPER_PORT=3000
```

### LibreChat fork (fork/.env)
```env
# Standard LibreChat env vars
MONGODB_URI=mongodb://mongo:27017/librechat
OPENAI_API_KEY=... (if testing with real API)
```

---

## Testing Strategy

### Unit Tests (wrapper logic)
- Test adapter translation (Bolek → LibreChat, reverse)
- Mock LibreChat responses
- Test error scenarios

### Integration Tests
- Start both wrapper + mock LibreChat
- Test full request cycle
- Verify adapter correctness

### End-to-End
- Start real wrapper + real fork
- Send message from BolekAI
- Verify response

---

## Deployment

### Docker (Local/Server)
```bash
docker-compose up -d
# Wrapper on :3000, fork on :3090
```

### To Cloudflare Workers (Future)
- Move wrapper code to Cloudflare Workers
- Fork stays Docker (or use managed service)
- Workers call fork via HTTPS

---

## Maintenance

### Upgrading LibreChat Fork
```bash
cd fork/
git fetch upstream
git merge upstream/main
docker-compose build librechat
docker-compose up
```

### Wrapper stays clean during upgrades
- Wrapper code untouched
- Only rebuild fork
- No merge conflicts

---

## Next Steps

See [WRAPPER-SETUP.md](WRAPPER-SETUP.md) for implementation instructions.
