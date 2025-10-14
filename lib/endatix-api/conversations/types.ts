export interface LatestConversationResponse {
  conversationId: number;
  agentId: number;
  createdAt: string;
  lastModified: string;
  resultJson?: string;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
  sequence: number;
}

export interface ChatMessage {
  isAi: boolean;
  content: string;
}
