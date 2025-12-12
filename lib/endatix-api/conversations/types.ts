export interface LatestConversationResponse {
  conversationId: string;
  agentId: string;
  createdAt: string;
  lastModified: string;
  resultJson?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
  sequence: number;
}

export interface ChatMessage {
  isAi: boolean;
  content: string;
}
