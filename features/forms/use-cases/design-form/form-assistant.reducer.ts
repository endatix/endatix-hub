import {
  ConversationState,
  emptyConversationState,
} from "./form.assistant.domain";

export enum ConversationActionType {
  ADD_USER_MESSAGE = "ADD_USER_MESSAGE",
  ADD_RESPONSE = "ADD_RESPONSE",
  SET_METADATA = "SET_METADATA",
  SET_ERROR = "SET_ERROR",
  INIT = "INIT",
}

type ConversationAction =
  | { type: ConversationActionType.ADD_USER_MESSAGE; payload: string }
  | {
      type: ConversationActionType.ADD_RESPONSE;
      payload: {
        definition: object;
        agentResponse: string;
      };
    }
  | {
      type: ConversationActionType.SET_METADATA;
      payload: {
        formId: string;
        threadId: string;
        agentId: string;
      };
    }
  | { type: ConversationActionType.SET_ERROR; payload: { error: string } }
  | { type: ConversationActionType.INIT; payload: ConversationState };

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
    case ConversationActionType.ADD_USER_MESSAGE:
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            isAi: false,
            content: action.payload,
          },
        ],
        error: undefined,
      };
    case ConversationActionType.ADD_RESPONSE:
      const messages = action.payload.agentResponse
        ? [
            ...state.messages,
            {
              isAi: true,
              content: action.payload.agentResponse,
            },
          ]
        : state.messages;
      return {
        ...state,
        resultJson: action.payload.definition
          ? JSON.stringify(action.payload.definition)
          : undefined,
        messages: messages,
        error: undefined,
      };
    case ConversationActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
      };
    case ConversationActionType.SET_METADATA:
      return {
        ...state,
        threadId: action.payload.threadId,
        agentId: action.payload.agentId,
        error: undefined,
      };
    case ConversationActionType.INIT:
      return emptyConversationState();
    default:
      return state;
  }
}
