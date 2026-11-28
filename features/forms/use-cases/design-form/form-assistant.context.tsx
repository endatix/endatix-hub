"use client";

import {
  createContext,
  ReactNode,
  use,
  useOptimistic,
  useReducer,
  useState,
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
import { resolveAssistantFolderGateError } from "./assistant-folder-gate";
import { generateFormForConversationAction } from "./generate-form-for-conversation.action";
import { ChatMessage } from "@/lib/endatix-api/conversations/types";
import { Result, type ResultType } from "@/lib/result";

export type AssistantFolderOption = { id: string; name: string };

function readProposal(text?: string | null) {
  if (!text) return { definition: undefined, errors: [] };
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("A form definition must be a JSON object.");
  }
  const survey = new Model();
  survey.fromJSON(parsed);
  return { definition: survey.toJSON(), errors: survey.jsonErrors?.map(error => error.message) ?? [] };
}

interface FormAssistantContext {
  isAssistantEnabled: boolean;
  chatContext: ConversationState | null;
  sendPrompt: (
    prompt: string,
    definition?: string,
  ) => Promise<ResultType<ConversationState>>;
  generateAssociatedForm: () => Promise<string | undefined>;
  /** When tenant policy requires a folder, set before generating a form from the assistant. */
  requireFolderForNewForms: boolean;
  assignableFolders: AssistantFolderOption[];
  assignFolderId: string | undefined;
  setAssignFolderId: (folderId: string | undefined) => void;
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
 * @property {ChatState} initialChatState - The initial chat state
 */
interface FormAssistantProviderProps {
  children: ReactNode;
  isAssistantEnabled: boolean;
  getConversationPromise?: Promise<ConversationState>;
  /** When true, new forms from the assistant must include a folder (matches tenant requireFolderAssignment). */
  requireFolderForNewForms?: boolean;
  defaultAssignFolderId?: string;
  assignableFolders?: AssistantFolderOption[];
}

export function FormAssistantProvider({
  children,
  isAssistantEnabled,
  getConversationPromise,
  requireFolderForNewForms = false,
  assignableFolders = [],
  defaultAssignFolderId,
}: Readonly<FormAssistantProviderProps>) {
  const initialConversation = getConversationPromise
    ? use(getConversationPromise)
    : emptyConversationState();
  const initialAssignFolderId =
    defaultAssignFolderId ??
    (requireFolderForNewForms && assignableFolders.length === 1
      ? assignableFolders[0].id
      : undefined);
  const [assignFolderId, setAssignFolderId] = useState<string | undefined>(
    initialAssignFolderId,
  );

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
  ): Promise<ResultType<ConversationState>> => {
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
      return Result.error(result.error.message);
    }

    const promptResponse = result.data;
    let definitionErrors: string[] = [];
    let validatedDefinition: object | undefined = undefined;

    try {
      const proposal = readProposal(promptResponse.agentResponse.definition);
      validatedDefinition = proposal.definition;
      definitionErrors = proposal.errors;
    } catch {
      dispatch({
        type: ConversationActionType.SET_ERROR,
        payload: {
          error: "Error parsing definition",
          definitionErrors: [],
        },
      });
      return Result.validationError("Error parsing definition");
    }

    const isNewConversation = !chatContext?.threadId || !chatContext?.agentId;

    dispatch({
      type: ConversationActionType.ADD_RESPONSE,
      payload: {
        userMessage: userMessage,
        tempUserMessageId: userMessage.id,
        agentResponse: promptResponse.agentResponse,
        resultDefinition: validatedDefinition,
        definitionErrors,
        error: undefined,
        threadId: isNewConversation ? promptResponse.threadId : undefined,
        agentId: isNewConversation ? promptResponse.agentId : undefined,
      },
    });

    return Result.success({
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
      error: undefined,
    });
  };

  const generateAssociatedForm = async (): Promise<string | undefined> => {
    if (chatContext?.formId) {
      console.debug("Form already created, skipping creation");
      return chatContext.formId;
    }

    const gateError = resolveAssistantFolderGateError(
      requireFolderForNewForms,
      assignableFolders,
      assignFolderId,
    );
    if (gateError !== null) {
      dispatch({
        type: ConversationActionType.SET_ERROR,
        payload: { error: gateError },
      });
      return undefined;
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
        folderId: assignFolderId,
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
    requireFolderForNewForms,
    assignableFolders,
    assignFolderId,
    setAssignFolderId,
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
