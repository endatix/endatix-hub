"use client";

import {
  createContext,
  ReactNode,
  use,
  useOptimistic,
  useReducer,
} from "react";
import {
  ConversationState,
  emptyConversationState,
} from "./form.assistant.domain";
import {
  ConversationActionType,
  conversationStateReducer,
} from "./form-assistant.reducer";
import { Model } from "survey-core";
import { defineFormAction } from "../../application/actions/define-form.action";
import { generateFormForConversationAction } from "./generate-form-for-conversation.action";
import { ChatMessage } from "@/lib/endatix-api/conversations/types";

interface FormAssistantContext {
  isAssistantEnabled: boolean;
  chatContext: ConversationState | null;
  sendPrompt: (
    prompt: string,
    definition?: string,
  ) => Promise<ConversationState>;
  generateAssociatedForm: () => Promise<string | undefined>;
}

/**
 * Context for the form assistant
 * @type {FormAssistantContext}
 * @description Context for the form assistant
 * @property {boolean} isEnabled - Whether the form assistant is enabled
 * @property {string} threadId - The thread id
 * @property {string} formId - The form id
 * @property {string} assistantId - The assistant id
 */
export const FormAssistantContext = createContext<
  FormAssistantContext | undefined
>(undefined);

/**
 * Props for the FormAssistantProvider
 * @type {FormAssistantProviderProps}
 * @description Props for the FormAssistantProvider
 * @property {ReactNode} children - The children to render
 * @property {boolean} isAssistantEnabled - Whether the form assistant is enabled
 * @property {string} formId - The form id to use for the conversation
 * @property {ChatState} initialChatState - The initial chat state
 */
interface FormAssistantProviderProps {
  children: ReactNode;
  isAssistantEnabled: boolean;
  formId?: string;
  getConversationPromise?: Promise<ConversationState>;
}

export function FormAssistantProvider({
  children,
  isAssistantEnabled,
  getConversationPromise,
}: FormAssistantProviderProps) {
  const initialConversation = getConversationPromise
    ? use(getConversationPromise)
    : emptyConversationState();
  const [chatContext, dispatch] = useReducer(
    conversationStateReducer,
    initialConversation,
  );
  const [optimisticChatContext, setOptimisticChatContext] = useOptimistic(
    chatContext,
    (state: ConversationState, update: Partial<ConversationState>) => ({
      ...state,
      ...update,
    }),
  );

  const sendPrompt = async (
    prompt: string,
    definition?: string,
  ): Promise<ConversationState> => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      isAi: false,
      content: prompt,
    };

    setOptimisticChatContext({
      isResponsePending: true,
      messages: [...chatContext.messages, userMessage],
    });

    dispatch({
      type: ConversationActionType.ADD_MESSAGE,
      payload: {
        message: userMessage,
        isResponsePending: true,
      },
    });

    const result = await defineFormAction({
      prompt,
      definition,
      threadId: chatContext?.threadId,
      formId: chatContext?.formId,
    });

    if (!result.success) {
      dispatch({
        type: ConversationActionType.SET_ERROR,
        payload: { error: result.error.message },
      });
      return chatContext;
    }

    const promptResponse = result.data;
    let definitionErrors: string[] = [];
    let validatedDefinition: object | undefined = undefined;
    let validationError: string | undefined = undefined;

    try {
      const resultJson = JSON.parse(
        promptResponse.agentResponse.definition ?? "{}",
      );
      const surveyModel = new Model();
      surveyModel.fromJSON(resultJson);
      if (surveyModel.jsonErrors?.length > 0) {
        definitionErrors = surveyModel.jsonErrors.map((error) => error.message);
        validationError = "Form generated with errors";
      }
      validatedDefinition = surveyModel.toJSON();
    } catch {
      dispatch({
        type: ConversationActionType.SET_ERROR,
        payload: {
          error: "Error parsing definition",
          definitionErrors: [],
        },
      });
      return chatContext;
    }

    const isNewConversation = !chatContext?.threadId || !chatContext?.agentId;

    dispatch({
      type: ConversationActionType.ADD_RESPONSE,
      payload: {
        userMessage: userMessage,
        tempUserMessageId: userMessage.id,
        agentResponse: promptResponse.agentResponse,
        resultDefinition: validatedDefinition ?? {},
        definitionErrors,
        error: validationError,
        threadId: isNewConversation ? promptResponse.threadId : undefined,
        agentId: isNewConversation ? promptResponse.agentId : undefined,
      },
    });

    return {
      ...chatContext,
      resultDefinition: validatedDefinition,
      definitionErrors,
      messages: [
        ...chatContext.messages,
        userMessage,
        {
          ...userMessage,
          isAi: false,
          id: promptResponse.userPrompt.id,
        },
        {
          ...promptResponse.agentResponse,
          isAi: true,
        },
      ],
      error: validationError,
    };
  };

  const generateAssociatedForm = async (): Promise<string | undefined> => {
    if (chatContext?.formId) {
      console.debug("Form already created, skipping creation");
      return chatContext.formId;
    }

    setOptimisticChatContext({
      isResponsePending: true,
    });

    try {
      const surveyModel = new Model();
      surveyModel.fromJSON(chatContext?.resultDefinition ?? "{}");

      const generateFormResult = await generateFormForConversationAction({
        formTitle: surveyModel.title ?? surveyModel.name ?? "AI Generated Form",
        formDefinitionSchema: surveyModel.toJSON(),
        conversationId: chatContext?.threadId ?? "",
        agentId: chatContext?.agentId ?? "",
      });

      if (!generateFormResult.success) {
        dispatch({
          type: ConversationActionType.SET_ERROR,
          payload: {
            error: generateFormResult.error.message,
          },
        });
        return undefined;
      }

      dispatch({
        type: ConversationActionType.SET_FORM_ID,
        payload: {
          formId: generateFormResult.data,
        },
      });
      return generateFormResult.data;
    } catch (error) {
      console.error("Error creating form", error);
      dispatch({
        type: ConversationActionType.SET_ERROR,
        payload: {
          error: "Error creating form",
        },
      });
      return undefined;
    }
  };

  const assistantContext: FormAssistantContext = {
    chatContext: optimisticChatContext,
    isAssistantEnabled,
    sendPrompt,
    generateAssociatedForm,
  };

  return (
    <FormAssistantContext value={assistantContext}>
      {children}
    </FormAssistantContext>
  );
}

/**
 * Hook to get the form assistant context
 * @returns {FormAssistantContext}
 * @description Hook to get the form assistant context
 * @throws {Error} if the form assistant context is not found
 */
export function useFormAssistant(): FormAssistantContext {
  const context = use(FormAssistantContext);
  if (!context) {
    throw new Error(
      "useFormAssistant must be used within a FormAssistantProvider",
    );
  }
  return context;
}
