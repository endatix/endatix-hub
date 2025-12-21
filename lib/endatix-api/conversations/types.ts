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

export interface Message {
  id: string;
  content: string;
}

export interface ChatMessage extends Message {
  isAi: boolean;
}

export interface PartialUpdateConversationRequest {
  agentId: string;
  conversationId: string;
  formId?: string;
  title?: string;
  resultJson?: object;
}
