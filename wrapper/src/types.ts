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

export interface LibreChatConversation {
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
