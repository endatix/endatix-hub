import { ChatMessage } from "@/lib/endatix-api/conversations/types";

export interface ConversationState {
  isResponsePending: boolean;
  threadId?: string;
  agentId?: string;
  formId?: string;
  messages: ChatMessage[];
  resultDefinition?: object;
  definitionErrors: string[];
  error?: string;
}

export const emptyConversationState = (
  error: string | undefined = undefined,
): ConversationState => ({
  isResponsePending: false,
  threadId: undefined,
  agentId: undefined,
  formId: undefined,
  messages: [],
  resultDefinition: undefined,
  definitionErrors: [],
  error: error,
});
