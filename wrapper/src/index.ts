import { Hono } from 'hono'
import { LibreChatAdapter } from './adapter'
import { Logger } from './logger'
import type { BolekMessage } from './types'

const app = new Hono()
const logger = new Logger('info')

const LIBRECHAT_URL = process.env.LIBRECHAT_URL || 'http://localhost:3090'
const WRAPPER_PORT = parseInt(process.env.WRAPPER_PORT || '3000')
const AUTH_TOKEN = process.env.BOLEK_API_TOKEN || 'test_token'

const adapter = new LibreChatAdapter(LIBRECHAT_URL, logger)

app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    logger.warn('Unauthorized request', { path: c.req.path })
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

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

app.get('/api/agent/conversations', async (c) => {
  try {
    const conversations = await adapter.listConversations()
    return c.json({ conversations })
  } catch (err) {
    logger.error('GET /api/agent/conversations failed', { error: String(err) })
    return c.json({ error: 'Failed to list conversations' }, 500)
  }
})

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

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'bolek-czat-wrapper' })
})

logger.info('BolekCzat wrapper starting', { port: WRAPPER_PORT, librechatUrl: LIBRECHAT_URL })

export default {
  fetch: app.fetch,
  port: WRAPPER_PORT
}
