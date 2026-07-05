# BolekCzat Wrapper — Implementation Setup

> Step-by-step guide to implement the wrapper for BolekCzat.
> This is for Codex to follow.

---

## Current State

- `fork/` directory contains LibreChat (unmodified)
- `src/` directory is empty (to be filled)
- `package.json` exists but needs wrapper dependencies
- `docker-compose.yml` needs updating

---

## Task 1: Initialize Wrapper Package

**File:** `package.json`

Replace entire file with:

```json
{
  "name": "bolek-czat-wrapper",
  "version": "1.0.0",
  "description": "Bolek-specific wrapper for LibreChat",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "node-fetch": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

**Commit:**
```
feat: initialize wrapper package.json with Hono dependencies
```

---

## Task 2: TypeScript Config

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Commit:**
```
chore: add TypeScript configuration for wrapper
```

---

## Task 3: Wrapper Types

**File:** `src/types.ts`

```typescript
export interface BolekMessage {
  message: string
  conversationId?: string
}

export interface BolekResponse {
  conversationId: string
  assistantMessage: string
  metadata: {
    tokensUsed: number
    executionTime: number
  }
}

export interface BolekConversation {
  id: string
  title: string
  createdAt: string
  messageCount: number
}

export interface LibreChartConversation {
  conversationId: string
  title: string
  createdAt: string
  messages: Array<{
    messageId: string
    text: string
    sender: 'user' | 'assistant'
    createdAt: string
  }>
}

export interface WrapperConfig {
  librechatUrl: string
  port: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  authToken: string
}
```

**Commit:**
```
feat: add wrapper type definitions
```

---

## Task 4: Logger

**File:** `src/logger.ts`

```typescript
export class Logger {
  private level: 'debug' | 'info' | 'warn' | 'error'

  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.level = level
  }

  info(message: string, data?: Record<string, any>) {
    console.log(JSON.stringify({ level: 'info', message, ...data, timestamp: new Date().toISOString() }))
  }

  error(message: string, data?: Record<string, any>) {
    console.error(JSON.stringify({ level: 'error', message, ...data, timestamp: new Date().toISOString() }))
  }

  warn(message: string, data?: Record<string, any>) {
    console.warn(JSON.stringify({ level: 'warn', message, ...data, timestamp: new Date().toISOString() }))
  }

  debug(message: string, data?: Record<string, any>) {
    if (this.level === 'debug') {
      console.log(JSON.stringify({ level: 'debug', message, ...data, timestamp: new Date().toISOString() }))
    }
  }
}
```

**Commit:**
```
feat: add structured logger
```

---

## Task 5: Adapter Layer

**File:** `src/adapter.ts`

```typescript
import { Logger } from './logger'
import type { BolekMessage, BolekResponse, BolekConversation, LibreChartConversation } from './types'

export class LibreChartAdapter {
  private baseUrl: string
  private logger: Logger

  constructor(baseUrl: string, logger: Logger) {
    this.baseUrl = baseUrl
    this.logger = logger
  }

  async sendMessage(request: BolekMessage, timeout: number = 10000): Promise<BolekResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const conversationId = request.conversationId || `conv_${Date.now()}`

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          text: request.message,
          // LibreChat specific fields
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        this.logger.error('LibreChat API error', { status: response.status })
        throw new Error(`LibreChat returned ${response.status}`)
      }

      const data = await response.json()

      // Transform LibreChat response to Bolek format
      const bolek: BolekResponse = {
        conversationId: data.conversationId || conversationId,
        assistantMessage: data.response || data.text || '',
        metadata: {
          tokensUsed: data.tokensUsed || 0,
          executionTime: Date.now()
        }
      }

      this.logger.info('Message processed', { conversationId, responseLength: bolek.assistantMessage.length })

      return bolek
    } catch (err) {
      this.logger.error('Adapter error in sendMessage', { error: String(err) })
      throw err
    }
  }

  async listConversations(): Promise<BolekConversation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`LibreChat returned ${response.status}`)
      }

      const data = await response.json()

      // Transform LibreChat conversations to Bolek format
      const conversations: BolekConversation[] = (data.conversations || []).map((conv: any) => ({
        id: conv.conversationId,
        title: conv.title || 'Untitled',
        createdAt: conv.createdAt,
        messageCount: conv.messageCount || 0
      }))

      return conversations
    } catch (err) {
      this.logger.error('Adapter error in listConversations', { error: String(err) })
      throw err
    }
  }

  async getConversation(conversationId: string): Promise<{
    conversation: BolekConversation
    messages: Array<{ role: string; content: string; createdAt: string }>
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`LibreChat returned ${response.status}`)
      }

      const data = await response.json()

      const conversation: BolekConversation = {
        id: data.conversationId,
        title: data.title || 'Untitled',
        createdAt: data.createdAt,
        messageCount: data.messages?.length || 0
      }

      const messages = (data.messages || []).map((msg: any) => ({
        role: msg.sender === 'assistant' ? 'assistant' : 'user',
        content: msg.text,
        createdAt: msg.createdAt
      }))

      return { conversation, messages }
    } catch (err) {
      this.logger.error('Adapter error in getConversation', { conversationId, error: String(err) })
      throw err
    }
  }
}
```

**Commit:**
```
feat: implement LibreChat adapter for Bolek format translation
```

---

## Task 6: Main Wrapper Server

**File:** `src/index.ts`

```typescript
import { Hono } from 'hono'
import { LibreChartAdapter } from './adapter'
import { Logger } from './logger'
import type { BolekMessage } from './types'

const app = new Hono()
const logger = new Logger('info')

// Config from env
const LIBRECHAT_URL = process.env.LIBRECHAT_URL || 'http://librechat:3090'
const WRAPPER_PORT = parseInt(process.env.WRAPPER_PORT || '3000')
const AUTH_TOKEN = process.env.BOLEK_API_TOKEN || 'test_token'

const adapter = new LibreChartAdapter(LIBRECHAT_URL, logger)

// Middleware: Auth
app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    logger.warn('Unauthorized request', { path: c.req.path })
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// POST /api/agent/message
app.post('/api/agent/message', async (c) => {
  try {
    const body = await c.req.json<BolekMessage>()
    logger.info('Received message', { message: body.message.substring(0, 50) })

    const response = await adapter.sendMessage(body)
    return c.json(response)
  } catch (err) {
    logger.error('POST /api/agent/message failed', { error: String(err) })
    return c.json({ error: 'Failed to process message' }, 500)
  }
})

// GET /api/agent/conversations
app.get('/api/agent/conversations', async (c) => {
  try {
    const conversations = await adapter.listConversations()
    return c.json({ conversations })
  } catch (err) {
    logger.error('GET /api/agent/conversations failed', { error: String(err) })
    return c.json({ error: 'Failed to list conversations' }, 500)
  }
})

// GET /api/agent/conversations/:id
app.get('/api/agent/conversations/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const result = await adapter.getConversation(id)
    return c.json(result)
  } catch (err) {
    logger.error('GET /api/agent/conversations/:id failed', { id: c.req.param('id'), error: String(err) })
    return c.json({ error: 'Failed to get conversation' }, 500)
  }
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'bolek-czat-wrapper' })
})

logger.info('BolekCzat wrapper starting', { port: WRAPPER_PORT, librechatUrl: LIBRECHAT_URL })

export default {
  fetch: app.fetch,
  port: WRAPPER_PORT
}
```

**Commit:**
```
feat: implement wrapper server with Bolek API endpoints
```

---

## Task 7: Docker Compose

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  wrapper:
    build:
      context: .
      dockerfile: Dockerfile.wrapper
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      LOG_LEVEL: info
      BOLEK_API_TOKEN: test_token_for_dev
      LIBRECHAT_URL: http://librechat:3090
      WRAPPER_PORT: 3000
    depends_on:
      - librechat
    networks:
      - bolek
    command: npm run dev

  librechat:
    build:
      context: ./fork
      dockerfile: Dockerfile
    ports:
      - "3090:3090"
    environment:
      MONGODB_URI: mongodb://mongo:27017/librechat
      NODE_ENV: development
    depends_on:
      - mongo
    networks:
      - bolek

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - bolek

networks:
  bolek:
    driver: bridge

volumes:
  mongo_data:
```

**File:** `Dockerfile.wrapper`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

**Commit:**
```
feat: add Docker configuration for wrapper + LibreChat
```

---

## Task 8: Environment Config

**File:** `.env.example`

```env
# Wrapper
NODE_ENV=development
LOG_LEVEL=info
WRAPPER_PORT=3000
BOLEK_API_TOKEN=test_token_for_dev
LIBRECHAT_URL=http://librechat:3090

# LibreChat (fork)
MONGODB_URI=mongodb://mongo:27017/librechat
```

**File:** `.env` (create for local dev)

Copy from `.env.example`

**Commit:**
```
chore: add environment configuration template
```

---

## Task 9: Testing

**File:** `src/__tests__/adapter.test.ts`

```typescript
import { LibreChartAdapter } from '../adapter'
import { Logger } from '../logger'

describe('LibreChartAdapter', () => {
  let adapter: LibreChartAdapter
  let logger: Logger

  beforeEach(() => {
    logger = new Logger('debug')
    adapter = new LibreChartAdapter('http://localhost:3090', logger)
  })

  it('should translate Bolek message format', async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversationId: 'conv_123',
        response: 'Hello from LibreChat'
      })
    })

    const result = await adapter.sendMessage({
      message: 'Hello',
      conversationId: 'conv_123'
    })

    expect(result.conversationId).toBe('conv_123')
    expect(result.assistantMessage).toBe('Hello from LibreChat')
    expect(result.metadata.tokensUsed).toBeGreaterThanOrEqual(0)
  })

  it('should list conversations', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: [
          {
            conversationId: 'conv_1',
            title: 'Chat 1',
            createdAt: '2026-01-15'
          }
        ]
      })
    })

    const conversations = await adapter.listConversations()
    expect(conversations).toHaveLength(1)
    expect(conversations[0].id).toBe('conv_1')
  })
})
```

**Commit:**
```
test: add adapter unit tests
```

---

## Task 10: README for Wrapper

**File:** `WRAPPER-README.md`

```markdown
# BolekCzat Wrapper

This directory contains the Bolek-specific wrapper for LibreChat.

## Structure

- `src/` — Wrapper code (Hono server, adapter, types)
- `fork/` — LibreChat fork (unmodified)
- `docker-compose.yml` — Run both services

## Quick Start

```bash
# Install and start
npm install
docker-compose up

# Wrapper listens on :3000
# LibreChat fork listens on :3090

# Test
curl -X POST http://localhost:3000/api/agent/message \
  -H "Authorization: Bearer test_token_for_dev" \
  -d '{"message":"Hello"}'
```

## Architecture

The wrapper translates between Bolek format (used by BolekAI orchestrator) and LibreChat format.

- Bolek → Wrapper → LibreChat → Bolek

## API Endpoints (Wrapper, port 3000)

- `POST /api/agent/message` — Send message
- `GET /api/agent/conversations` — List conversations
- `GET /api/agent/conversations/:id` — Get conversation with history
- `GET /health` — Health check

See [WRAPPER-STRUCTURE.md](WRAPPER-STRUCTURE.md) for full documentation.
```

**Commit:**
```
docs: add wrapper README
```

---

## Verification Checklist

After completing all tasks:

- [ ] `npm install` succeeds
- [ ] `npm run build` compiles TypeScript without errors
- [ ] `docker-compose up` starts both wrapper and LibreChat
- [ ] Wrapper responds on http://localhost:3000/health
- [ ] LibreChat responds on http://localhost:3090
- [ ] POST /api/agent/message works with Bearer token
- [ ] GET /api/agent/conversations works
- [ ] All unit tests pass

---

## Next: BolekFlow and BolekKB

After completing BolekCzat wrapper, apply same pattern to:
- BolekFlow (wrapper around n8n)
- BolekKB (wrapper around AnythingLLM)

Each follows same structure:
1. Types and logger
2. Adapter (service-specific translation)
3. Hono server with Bolek API
4. Docker compose
5. Tests

---

## Questions?

If stuck:
1. Check LibreChat API docs in `fork/docs/`
2. Look at adapter tests
3. Check docker logs: `docker-compose logs wrapper`
