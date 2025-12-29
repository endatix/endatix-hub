import { ApiResult, ApiErrorType, EndatixApi } from "@/lib/endatix-api";
import {
  ConversationState,
  emptyConversationState,
} from "./form.assistant.domain";
import { Session } from "next-auth";
import {
  ChatMessage,
  ConversationMessage,
  LatestConversationResponse,
} from "@/lib/endatix-api/conversations/types";
import { Model } from "survey-core";

/**
 * Gets the current conversation for the form.
 * @param formId - The ID of the form.
 * @param session - The session.
 * @returns The conversation state.
 */
export async function getCurrentConversationUseCase(
  formId: string,
  session: Session | null,
): Promise<ConversationState> {
  if (!formId) {
    return emptyConversationState();
  }

  try {
    const api = new EndatixApi(session?.accessToken);
    const latestConversationResult =
      await api.conversations.getLatestConversation(formId);

    if (ApiResult.isError(latestConversationResult)) {
      return handleGetConversationError(latestConversationResult);
    }

    const { conversationId, agentId, resultJson } =
      latestConversationResult.data;

    let resultDefinition: object = {};
    let definitionErrors: string[] = [];

    if (resultJson) {
      try {
        resultDefinition = JSON.parse(resultJson);
        const surveyModel = new Model();
        surveyModel.fromJSON(resultDefinition);

        if (surveyModel.jsonErrors?.length > 0) {
          definitionErrors = surveyModel.jsonErrors.map(
            (error) => error.message,
          );
        }
      } catch {
        console.error(
          "Failed to parse resultJson. Using empty object instead.",
          resultJson,
        );
      }
    }

    const messagesResult = await api.conversations.getConversationMessages(
      conversationId,
    );

    if (ApiResult.isError(messagesResult)) {
      return {
        isResponsePending: false,
        threadId: conversationId,
        agentId: agentId,
        formId: formId,
        messages: [],
        resultDefinition: resultDefinition,
        error:
          messagesResult.error.message ||
          "Failed to load conversation message. Please try again.",
        definitionErrors,
      };
    }

    const chatMessages = transformConversationMessages(messagesResult.data);

    return {
      isResponsePending: false,
      threadId: conversationId,
      agentId: agentId,
      formId: formId,
      messages: chatMessages,
      resultDefinition,
      definitionErrors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load conversation";
    console.error("Failed to fetch conversation:", errorMessage);
    return emptyConversationState(errorMessage);
  }
}

/**
 * Handles the error case for the getCurrentConversationUseCase.
 * @param errorResult - The error result from the API call.
 * @returns The conversation state.
 */
function handleGetConversationError(
  errorResult: ApiResult<LatestConversationResponse>,
): ConversationState {
  if (ApiResult.isSuccess(errorResult)) {
    throw new Error(
      "Unexpected error during processing getCurrentConversationUseCase. Method is handling error result, but received success result.",
    );
  }

  if (errorResult.error.type === ApiErrorType.NotFoundError) {
    return emptyConversationState();
  }

  const errorMessage =
    errorResult.error.message || "Failed to load conversation";
  return emptyConversationState(errorMessage);
}

/**
 * Transforms the conversation messages to the chat messages.
 * @param messages - The conversation messages.
 * @returns The transformed chat messages.
 */
function transformConversationMessages(
  messages: ConversationMessage[],
): ChatMessage[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  return messages
    .toSorted((a, b) => a.sequence - b.sequence)
    .map((msg) => ({
      isAi: msg.role === "assistant",
      content: msg.content,
      id: msg.id,
    }));
}
