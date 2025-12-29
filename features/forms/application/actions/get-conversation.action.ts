"use server";

import { ApiResult, ApiErrorType, EndatixApi } from "@/lib/endatix-api";
import { getSession } from "@/features/auth";
import { ChatContext } from "@/features/forms/ui/chat/use-cases/assistant";
import { ConversationMessage } from "@/lib/endatix-api/conversations/types";

export async function getConversationAction(
  formId: string,
): Promise<ChatContext> {
  try {
    const session = await getSession();
    const api = new EndatixApi(session);

    // Step 1: Get latest conversation
    const conversationResult = await api.conversations.getLatestConversation(
      formId,
    );

    if (ApiResult.isError(conversationResult)) {
      // 404 = No conversation yet (first time opening form) - this is normal
      if (conversationResult.error.type === ApiErrorType.NotFoundError) {
        return {
          conversationId: undefined,
          messages: [],
          threadId: "",
          agentId: "",
          isInitialPrompt: true,
        };
      }

      // Other errors
      return {
        conversationId: undefined,
        messages: [],
        threadId: "",
        agentId: "",
        isInitialPrompt: true,
        error:
          conversationResult.error.message || "Failed to load conversation",
      };
    }

    // Step 2: Get messages for this conversation
    const messagesResult = await api.conversations.getConversationMessages(
      conversationResult.data.conversationId,
    );

    if (ApiResult.isError(messagesResult)) {
      console.error("Failed to fetch messages:", messagesResult.error);
      return {
        conversationId: conversationResult.data.conversationId,
        agentId: conversationResult.data.agentId.toString(),
        threadId: conversationResult.data.conversationId.toString(),
        messages: [],
        isInitialPrompt: true,
        error: "Failed to load conversation messages",
      };
    }

    // Transform backend messages to frontend format
    const messages = messagesResult.data.map(
      (message: ConversationMessage) => ({
        id: message.id,
        content: message.content,
        isAi: message.role === "assistant",
      }),
    );

    return {
      conversationId: conversationResult.data.conversationId,
      agentId: conversationResult.data.agentId.toString(),
      threadId: conversationResult.data.conversationId.toString(),
      messages: messages,
      isInitialPrompt: messages.length === 0,
      resultJson: conversationResult.data.resultJson,
    };
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return {
      conversationId: undefined,
      messages: [],
      threadId: "",
      agentId: "",
      isInitialPrompt: true,
      error:
        error instanceof Error ? error.message : "Failed to load conversation",
    };
  }
}
