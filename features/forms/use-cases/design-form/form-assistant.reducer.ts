import { ChatMessage, Message } from "@/lib/endatix-api/conversations/types";
import {
  ConversationState,
  emptyConversationState,
} from "./form.assistant.domain";

export enum ConversationActionType {
  INIT = "INIT",
  ADD_MESSAGE = "ADD_MESSAGE",
  ADD_RESPONSE = "ADD_RESPONSE",
  SET_FORM_ID = "SET_FORM_ID",
  SET_ERROR = "SET_ERROR",
}

type ConversationAction =
  | { type: ConversationActionType.INIT; payload: ConversationState }
  | { type: ConversationActionType.ADD_MESSAGE; payload: ChatMessage }
  | {
      type: ConversationActionType.ADD_RESPONSE;
      payload: {
        userMessage: Message;
        tempUserMessageId: string;
        agentResponse: Message;
        resultDefinition: object;
        definitionErrors?: string[];
        error?: string;
        threadId?: string;
        agentId?: string;
      };
    }
  | { type: ConversationActionType.SET_FORM_ID; payload: { formId: string } }
  | {
      type: ConversationActionType.SET_ERROR;
      payload: {
        error: string;
        definitionErrors?: string[];
      };
    };

/**
 * Reducer for the conversation state
 * @param state - The current state
 * @param action - The action to perform
 * @returns The new state
 */
export function conversationStateReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case ConversationActionType.INIT:
      return action.payload ?? emptyConversationState();
    case ConversationActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: undefined,
      };
    case ConversationActionType.ADD_RESPONSE:
      let updatedMessages: ChatMessage[] = state.messages;
      const payload = action.payload;

      if (payload.tempUserMessageId && payload.userMessage) {
        updatedMessages = state.messages.map((message) => {
          if (message.id === payload.tempUserMessageId) {
            console.log("Updating temp user message");
            return {
              ...message,
              id: payload.userMessage.id,
            };
          }
          return message;
        });
      }

      if (payload.agentResponse) {
        updatedMessages.push({
          ...payload.agentResponse,
          isAi: true,
        });
      }

      return {
        ...state,
        messages: updatedMessages,
        resultDefinition: action.payload.resultDefinition,
        definitionErrors: action.payload.definitionErrors ?? [],
        error: action.payload.error,
        threadId: action.payload.threadId ?? state.threadId,
        agentId: action.payload.agentId ?? state.agentId,
      };
    case ConversationActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
      };
    case ConversationActionType.SET_FORM_ID:
      return {
        ...state,
        threadId: action.payload.formId,
        error: undefined,
      };
    default:
      return state;
  }
}
