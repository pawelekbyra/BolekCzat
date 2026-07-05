import { Logger } from './logger'
import type { BolekMessage, BolekResponse, BolekConversation, LibreChatConversation } from './types'

export class LibreChatAdapter {
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
          text: request.message
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        this.logger.error('LibreChat API error', { status: response.status })
        throw new Error(`LibreChat returned ${response.status}`)
      }

      const data = await response.json()

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
