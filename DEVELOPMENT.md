# BolekCzat — Development Guide

> How to develop the web UI client for Agent Bolek.

---

## Quick Start

```bash
# Setup
npm install
npm run smart-reinstall  # Full rebuild

# Development
npm run frontend:dev     # HMR dev server on :3090

# Connect to agent
# Set env vars:
BOLEK_API_URL=http://localhost:8787
BOLEK_API_TOKEN=test_token

# Test
npm test

# Build & Deploy
npm run build
npm run deploy  # Deploy to Vercel
```

---

## Architecture

BolekCzat is a **thin client** that talks to BolekAI via HTTP.

```
User (browser)
  ↓ (types message)
React Component
  ↓ (POST /api/agent/message)
HTTP Client
  ↓ (Bearer token)
BolekAI (agent orchestrator)
  ├─ parses intent
  ├─ calls tools
  └─ returns response
  ↓ (response + metadata)
React Component (displays)
```

---

## Adding a Feature

### Example: Display tool usage

1. Update API response display:

```typescript
// pages/chat/components/Message.tsx
interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    tokensUsed: number
    toolsCalled?: string[]
    executionTime: number
  }
}

export function Message({ role, content, metadata }: MessageProps) {
  return (
    <div className={`message ${role}`}>
      <p>{content}</p>
      {metadata && (
        <div className="metadata">
          <span>⚡ {metadata.tokensUsed} tokens</span>
          {metadata.toolsCalled && (
            <span>🔧 Used: {metadata.toolsCalled.join(', ')}</span>
          )}
        </div>
      )}
    </div>
  )
}
```

2. Update conversation fetch:

```typescript
// services/api-helper.ts
const response = await fetch(`${BOLEK_API_URL}/api/agent/message`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BOLEK_API_TOKEN}`,
  },
  body: JSON.stringify(payload)
})

const data = await response.json()
setMessages(prev => [...prev, {
  role: 'assistant',
  content: data.assistantMessage,
  metadata: data.metadata  // ← Pass metadata
}])
```

3. Test locally:
```bash
npm run frontend:dev
# Type a message and see metadata display
```

---

## Service Integration

BolekCzat never calls external services directly. Everything goes through BolekAI.

```
❌ DON'T:
BolekCzat → BolekFlow (direct call)

✅ DO:
BolekCzat → BolekAI → BolekFlow
```

---

## Authentication

### User Auth (Clerk)
```typescript
import { useAuth } from '@clerk/nextjs'

export function Dashboard() {
  const { isSignedIn, user } = useAuth()
  
  if (!isSignedIn) return <SignInPage />
  
  return <ChatPage userId={user.id} />
}
```

### Agent Auth (Bearer Token)
```typescript
const response = await fetch(`${BOLEK_API_URL}/api/agent/message`, {
  headers: {
    'Authorization': `Bearer ${BOLEK_API_TOKEN}`,  // ← Service token
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message, conversationId })
})
```

---

## Error Handling

```typescript
async function sendMessage(message: string) {
  try {
    const response = await fetch(`${BOLEK_API_URL}/api/agent/message`, {
      method: 'POST',
      body: JSON.stringify({ message })
    })
    
    if (response.status === 503) {
      // Agent is down
      showToast('Agent is temporarily unavailable')
      return
    }
    
    if (response.status === 401) {
      // Token expired
      refreshToken()
      return sendMessage(message)
    }
    
    const data = await response.json()
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.assistantMessage
    }])
    
  } catch (error) {
    showToast('Network error: ' + error.message)
  }
}
```

---

## Component Structure

```
components/
├── Chat/
│   ├── ChatContainer.tsx     # Main chat UI
│   ├── MessageList.tsx       # Renders messages
│   ├── Message.tsx           # Single message
│   └── InputBox.tsx          # User input
├── Conversations/
│   ├── ConversationList.tsx
│   └── ConversationItem.tsx
├── Common/
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Toast.tsx
└── Layout/
    ├── Sidebar.tsx
    └── Header.tsx
```

---

## Testing

```bash
# Unit tests
npm test

# Example test
describe('Message', () => {
  it('should display metadata', () => {
    const { getByText } = render(
      <Message
        role="assistant"
        content="Hello"
        metadata={{ tokensUsed: 145 }}
      />
    )
    expect(getByText('145 tokens')).toBeInTheDocument()
  })
})
```

---

## Environment Variables

```env
# BolekAI connection (production)
NEXT_PUBLIC_BOLEK_API_URL=https://kulfon.pawel-perfect.workers.dev
BOLEK_API_TOKEN=... (from Cloudflare secrets)

# Clerk auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=...
```

---

## Performance Tips

- Use React Query for API caching
- Implement conversation pagination (load 50 at a time)
- Virtualize message list if > 1000 messages
- Debounce typing indicator

---

## Deployment

```bash
# Vercel (recommended)
npm run deploy

# Or manually
vercel --prod
```

**Environment variables on Vercel:**
```
NEXT_PUBLIC_BOLEK_API_URL=https://kulfon.pawel-perfect.workers.dev
BOLEK_API_TOKEN=... (add as secret)
```

---

## Current Phase

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for what's next.
