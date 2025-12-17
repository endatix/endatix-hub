import { ChatMessage } from '@/lib/endatix-api/conversations/types';

export interface ConversationState {
  threadId?: string;
  agentId?: string;
  messages: ChatMessage[];
  isInitialPrompt: boolean;
  resultJson?: string;
  error?: string;
}


export const emptyConversationState = (
  error: string | undefined = undefined,
): ConversationState => ({
  messages: [],
  isInitialPrompt: true,
  error: error,
});
