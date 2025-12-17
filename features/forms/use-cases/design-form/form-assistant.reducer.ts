import {
  ConversationState,
  emptyConversationState,
} from "./form.assistant.domain";

export enum ConversationActionType {
  ADD_USER_MESSAGE = "ADD_USER_MESSAGE",
  SET_RESULT_JSON = "SET_RESULT_JSON",
  SET_FORM_ID = "SET_FORM_ID",
  SET_ERROR = "SET_ERROR",
  RESET = "RESET",
  INIT = "INIT",
}

type ConversationAction =
  | { type: ConversationActionType.ADD_USER_MESSAGE; payload: string }
  | {
      type: ConversationActionType.SET_RESULT_JSON;
      payload: { definition: object; agentResponse: string };
    }
  | { type: ConversationActionType.SET_FORM_ID; payload: { formId: string } }
  | { type: ConversationActionType.SET_ERROR; payload: { error: string } }
  | { type: ConversationActionType.RESET }
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
    case ConversationActionType.SET_RESULT_JSON:
      return {
        ...state,
        resultJson: action.payload.definition
          ? JSON.stringify(action.payload.definition)
          : undefined,
        messages: [
          ...state.messages,
          {
            isAi: true,
            content: action.payload.agentResponse,
          },
        ],
        error: undefined,
      };
    case ConversationActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
      };
    case ConversationActionType.RESET:
      return emptyConversationState();
    case ConversationActionType.INIT:
      return action.payload;
    default:
      return state;
  }
}
