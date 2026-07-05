# BolekCzat — Agent Integration Architecture

> **Role in Bolek Network:** Web UI + Chat Interface
>
> BolekCzat is a specialized service providing the web conversation interface for Agent Bolek. It is **not** the decision-maker or orchestrator — it is a **client service** that talks to BolekAI.

---

## 1. Role Definition

**What BolekCzat Is:**
- Web UI for chatting with Agent Bolek
- Conversation history management
- Thread/chat organization
- User authentication (Clerk)
- Conversation persistence

**What BolekCzat Is NOT:**
- Not the orchestrator (BolekAI is)
- Not a secret keeper (no ops keys)
- Not the decision-maker (agent makes decisions)
- Not the memory system (BolekAI manages memory)

---

## 2. Communication Flow

### BolekCzat → BolekAI (Agent API)

BolekCzat is a **thin client** that calls BolekAI as the intelligence backend.

```
User types in BolekCzat
  ↓
BolekCzat captures message
  ↓
POST /api/agent/message to BolekAI
  ├─ userId
  ├─ conversationId
  ├─ message text
  └─ optional context (memories, recent events)
  ↓
BolekAI orchestrates
  ├─ parses intent
  ├─ calls tools
  ├─ enforces policy
  └─ returns response
  ↓
BolekCzat displays response
  ↓
User sees answer + metadata
```

---

## 3. API Contract: BolekCzat ↔ BolekAI

### Endpoint: POST /api/agent/message

**Request:**

```typescript
{
  userId: string              // Owner identifier
  conversationId?: string     // Existing thread, or null for new
  message: string             // User message
  context?: {
    memories?: string[]       // Recently recalled memories
    recentEvents?: string[]   // Last 3-5 events from audit
    userPreferences?: {
      mode: 'autonomous' | 'ask_approval' | 'manual'
      timeZone: string
    }
  }
}
```

**Response:**

```typescript
{
  success: boolean
  conversationId: string      // Thread ID (may be newly created)
  assistantMessage: string    // Agent's response
  metadata: {
    tokensUsed: number
    executionTime: number     // ms
    toolsCalled?: string[]    // names of tools agent used
    approvalRequested?: boolean
  }
  memory?: {
    proposedFacts?: string[]  // Things agent learned to remember
    requiresApproval?: boolean
  }
  errors?: string[]
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/agent/message \
  -H "Authorization: Bearer BOLEK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "pawel",
    "conversationId": "conv_123",
    "message": "Create a note about today and remind me tomorrow"
  }'
```

### Endpoint: GET /api/agent/conversations

Fetch list of conversations for a user.

```typescript
Response:
{
  conversations: Array<{
    id: string
    title: string           // First message or auto-titled
    lastMessage: string
    lastMessageTime: string
    messageCount: number
  }>
}
```

### Endpoint: GET /api/agent/conversations/:id

Fetch full conversation history.

```typescript
Response:
{
  id: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    metadata?: {
      tokensUsed?: number
      toolsCalled?: string[]
    }
  }>
}
```

---

## 4. Authentication

### BolekCzat Service Auth

**User auth (Clerk):**
- Users log in via Clerk
- Clerk provides session token
- BolekCzat validates token
- Only owner (@pawelekbyra) can access Bolek

**Service-to-service auth:**
- BolekCzat has `BOLEK_API_TOKEN` (bearer token)
- All requests to BolekAI include: `Authorization: Bearer BOLEK_API_TOKEN`
- BolekAI verifies token on every request

**Env variables for BolekCzat:**

```env
# Clerk auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# BolekAI connection
BOLEK_API_URL=https://kulfon.pawel-perfect.workers.dev
BOLEK_API_TOKEN=... (generate in BolekAI secrets)

# Database (if persisting chat locally)
MONGODB_URI=...
```

---

## 5. Conversation Storage

### Option A: Stateless (chat history in BolekAI)

BolekCzat doesn't store messages — it just displays them. BolekAI maintains full history in D1.

**Pros:**
- Single source of truth
- Agent always has full context
- Simple frontend

**Cons:**
- Every GET /conversations/:id hits BolekAI
- More requests to orchestrator

### Option B: Cached (local MongoDB)

BolekCzat mirrors conversations locally for faster UI.

**Pros:**
- Instant conversation list + load
- Offline-capable UI

**Cons:**
- Requires sync logic (eventual consistency)
- Duplicate data

**Recommended:** Start with Option A (stateless), move to Option B if performance needed.

---

## 6. Metadata & Monitoring

### What BolekCzat should track

- User session time
- Number of messages per day
- Average response time
- Error rates
- Which tools are most-used

**Send to analytics (e.g., Posthog, Vercel Analytics):**

```typescript
// After each agent response
analytics.track('agent_response', {
  conversationId: '...',
  tokensUsed: 150,
  executionTime: 450,
  toolsCalled: ['notes_create', 'web_search'],
  success: true
})
```

---

## 7. UI/UX Considerations

### Display Agent Metadata

After agent response, show:

```
Response: "I've created a note and searched the web..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 145 tokens | ⏱ 340ms
🔧 Used: notes_create, web_search
```

### Approval Flows

If agent requests approval:

```
Agent: "I can refund $50 to customer@example.com. Approve?"

[❌ Deny] [✅ Approve with details...]
```

BolekCzat sends approval back to BolekAI:

```typescript
POST /api/agent/approvals/:approvalId
{
  decision: 'approved' | 'denied'
  notes?: string
}
```

### Memory Proposals

If agent suggests learning something:

```
📝 Should I remember: "You're allergic to gluten"?
[❌ No] [✅ Yes, remember it]
```

---

## 8. Error Handling

### Network Errors

```typescript
if (response.status === 503) {
  // BolekAI is down
  showToast("Agent is temporarily unavailable. Try again?")
}

if (response.status === 401) {
  // Token expired
  refreshBolekToken()
  retry()
}

if (response.timeout > 30000) {
  // Too slow
  showToast("Agent is taking longer than usual...")
}
```

### Graceful Degradation

If BolekAI is unreachable:

```
User: "What should I do today?"
BolekCzat: "I can't reach Agent Bolek right now (503). 
           But here are your tasks from last sync:
           - Call dentist
           - Review PRs"
```

---

## 9. Development Setup

### Local Testing

```bash
# Terminal 1: BolekAI Worker
cd /home/user/BolekAI
npm run dev                    # http://localhost:8787

# Terminal 2: BolekCzat
cd /home/user/BolekCzat
npm run dev                    # http://localhost:3000

# .env.local in BolekCzat
BOLEK_API_URL=http://localhost:8787
BOLEK_API_TOKEN=test_token_for_dev
```

### Testing Agent Integration

```bash
# Test the API directly
curl -X POST http://localhost:8787/api/agent/message \
  -H "Authorization: Bearer test_token_for_dev" \
  -d '{"userId":"pawel","message":"Hello"}'
```

---

## 10. Deployment

### BolekCzat Deployment (Vercel)

```bash
vercel deploy \
  --env BOLEK_API_URL=https://kulfon.pawel-perfect.workers.dev \
  --env BOLEK_API_TOKEN=$(cat .bolek-token)
```

### Monitoring

- **Response time:** Should be < 500ms (usually 100-300ms)
- **Error rate:** Should be < 1%
- **Token usage:** Track to understand model cost
- **Uptime:** Monitor BolekAI availability

---

## 11. Security

### Never In BolekCzat

- ❌ Stripe keys
- ❌ GitHub tokens
- ❌ Vercel tokens
- ❌ Polutek ops keys
- ❌ Email credentials
- ❌ Clerk secret key

All sensitive operations go through BolekAI with its scoped keys.

### Example: Safe Refund Flow

```
BolekCzat: "User wants to refund $50"
  ↓ (doesn't have Stripe key)
BolekAI: "Got refund request"
  ↓ (has Stripe key, checks policy)
Policy: "CRITICAL RISK, needs approval"
  ↓
BolekAI: Sends approval request back to BolekCzat
BolekCzat: Shows approval UI to user
User: Approves in Telegram (or BolekCzat)
  ↓
BolekAI: Executes refund (with Stripe key)
BolekAI: Returns result to BolekCzat
BolekCzat: Displays "Refund completed"
```

---

## 12. Future: Real-time Features

### WebSocket Support

For real-time responses (streaming agent thoughts):

```typescript
ws://localhost:8787/api/agent/stream

{
  userId: "pawel",
  message: "Research this topic"
}

// Server sends chunks:
{ type: 'thinking', content: 'Searching for...' }
{ type: 'tool_call', tool: 'web_search', status: 'running' }
{ type: 'tool_result', tool: 'web_search', result: {...} }
{ type: 'response', content: 'Here\'s what I found...' }
{ type: 'done' }
```

**Not required for v1.** HTTP works fine initially.

---

## 13. Architecture Summary

```
BolekCzat (Vercel)
├── UI layer (React/Next.js)
├── Auth (Clerk)
├── HTTP client to BolekAI
└── Local state (conversation, preferences)
        ↓ (all logic/decisions go here)
BolekAI (Cloudflare)
├── Orchestrator
├── Memory (D1)
├── Tools (built-in + external)
└── Policy engine
        ↓ (tools call external services)
BolekFlow, BolekKB, etc.
```

---

## 14. Related Docs

- [`docs/BOLEK-NETWORK.md`](../BolekAI/docs/BOLEK-NETWORK.md) — High-level ecosystem
- [`docs/MULTI-AGENT-ARCHITECTURE.md`](../BolekAI/docs/MULTI-AGENT-ARCHITECTURE.md) — Detailed tri-tier design
- [`docs/LIBRECHAT-INTEGRATION.md`](./docs/LIBRECHAT-INTEGRATION.md) — BolekCzat-specific setup (if using LibreChat base)

---

## Key Principle

> **BolekCzat is a client, not a server.**
>
> It displays agent responses. It does not make agent decisions.
> It sends messages. It does not orchestrate workflows.
> It shows memories. It does not enforce policy.
>
> BolekAI is the **single source of truth** for agent intelligence.
