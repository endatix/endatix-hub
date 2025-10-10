import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  LatestConversationResponse,
  ConversationMessage,
  ChatMessage,
} from "./types";

export class ConversationsApi {
  constructor(private baseApi: EndatixApi) {}

  async getLatestConversation(
    formId: string,
  ): Promise<ApiResult<LatestConversationResponse>> {
    return this.baseApi.get<LatestConversationResponse>(
      `/agents/forms/${formId}/conversations/latest`,
    );
  }

  async getConversationMessages(
    conversationId: number,
  ): Promise<ApiResult<ConversationMessage[]>> {
    return this.baseApi.get<ConversationMessage[]>(
      `/agents/conversations/${conversationId}/messages`,
    );
  }

  transformMessages(messages: ConversationMessage[]): ChatMessage[] {
    return messages
      .sort((a, b) => a.sequence - b.sequence)
      .map((msg) => ({
        isAi: msg.role === "assistant",
        content: msg.content,
      }));
  }
}
