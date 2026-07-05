import { LibreChatAdapter } from '../adapter'
import { Logger } from '../logger'

describe('LibreChatAdapter', () => {
  let adapter: LibreChatAdapter
  let logger: Logger

  beforeEach(() => {
    logger = new Logger('debug')
    adapter = new LibreChatAdapter('http://localhost:3090', logger)
  })

  it('should send message and transform response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversationId: 'conv_123',
        response: 'Hello from LibreChat',
        tokensUsed: 100
      })
    })

    const result = await adapter.sendMessage({
      message: 'Hello',
      conversationId: 'conv_123'
    })

    expect(result.conversationId).toBe('conv_123')
    expect(result.assistantMessage).toBe('Hello from LibreChat')
    expect(result.metadata.tokensUsed).toBe(100)
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

  it('should handle adapter errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

    await expect(adapter.sendMessage({ message: 'test' })).rejects.toThrow()
  })
})
