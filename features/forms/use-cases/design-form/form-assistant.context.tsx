"use client";

import { createContext, ReactNode, use, useReducer } from "react";
import {
  ConversationState,
  emptyConversationState,
} from "./form.assistant.domain";
import { ApiResult, DefineFormResponse } from "@/lib/endatix-api";
import {
  ConversationActionType,
  conversationStateReducer,
} from "./form-assistant.reducer";

interface FormAssistantContext {
  isAssistantEnabled: boolean;
  chatContext: ConversationState | null;
  formId?: string;
  sendPrompt: (
    prompt: string,
    definition?: string,
  ) => Promise<ConversationState>;
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
  formId,
}: FormAssistantProviderProps) {
  const initialConversation = getConversationPromise
    ? use(getConversationPromise)
    : emptyConversationState();
  const [chatContext, dispatch] = useReducer(
    conversationStateReducer,
    initialConversation,
  );

  const sendPrompt = async (
    prompt: string,
    definition?: string,
  ): Promise<ConversationState> => {
    dispatch({
      type: ConversationActionType.ADD_USER_MESSAGE,
      payload: prompt,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const formDefinitionObj = {
      pages: [
        {
          name: "page1",
          elements: [
            {
              name: "fullName",
              type: "text",
              title: "Full name",
              isRequired: true,
            },
            {
              name: "email",
              type: "text",
              title: "Email address",
              inputType: "email",
              isRequired: true,
            },
            {
              name: "phone",
              type: "text",
              title: "Phone number",
              inputType: "tel",
              startWithNewLine: false,
            },
            {
              name: "age",
              type: "text",
              title: "Age",
              inputType: "number",
              isRequired: true,
              validators: [
                {
                  type: "numeric",
                  maxValue: 120,
                  minValue: 1,
                },
              ],
            },
            {
              name: "guardianName",
              type: "text",
              title: "Parent/Guardian full name",
              visibleIf: "{age} < 18",
              isRequired: true,
            },
            {
              name: "guardianPhone",
              type: "text",
              title: "Parent/Guardian phone number",
              inputType: "tel",
              visibleIf: "{age} < 18",
              isRequired: true,
            },
            {
              name: "experience",
              type: "radiogroup",
              title: "Experience level",
              choices: [
                {
                  text: "Beginner",
                  value: "beginner",
                },
                {
                  text: "Intermediate",
                  value: "intermediate",
                },
                {
                  text: "Advanced",
                  value: "advanced",
                },
              ],
              isRequired: true,
            },
            {
              name: "styles",
              type: "checkbox",
              title: "Preferred styles",
              choices: [
                {
                  text: "Rock",
                  value: "rock",
                },
                {
                  text: "Pop",
                  value: "pop",
                },
                {
                  text: "Blues",
                  value: "blues",
                },
                {
                  text: "Jazz",
                  value: "jazz",
                },
                {
                  text: "Classical",
                  value: "classical",
                },
                {
                  text: "Metal",
                  value: "metal",
                },
                {
                  text: "Country",
                  value: "country",
                },
              ],
              hasOther: true,
            },
            {
              name: "lessonsPerWeek",
              type: "text",
              title: "Lessons per week",
              inputType: "number",
              isRequired: true,
              validators: [
                {
                  type: "numeric",
                  minValue: 0,
                },
              ],
            },
            {
              name: "lessonLength",
              type: "radiogroup",
              title: "Preferred lesson length",
              choices: [
                {
                  text: "30 minutes",
                  value: 30,
                },
                {
                  text: "45 minutes",
                  value: 45,
                },
                {
                  text: "60 minutes",
                  value: 60,
                },
              ],
              isRequired: true,
              startWithNewLine: false,
            },
            {
              name: "hourlyRate",
              type: "text",
              title: "Preferred hourly rate (USD)",
              inputType: "number",
              isRequired: true,
              validators: [
                {
                  type: "numeric",
                  minValue: 0,
                },
              ],
            },
            {
              name: "estimatedMonthlyCost",
              type: "expression",
              title: "Estimated monthly cost",
              expression:
                "iif(({hourlyRate} > 0 and {lessonsPerWeek} > 0 and {lessonLength} > 0), {hourlyRate} * ({lessonsPerWeek} * {lessonLength} / 60) * 4, 0)",
              displayStyle: "currency",
            },
            {
              name: "availabilityDays",
              type: "checkbox",
              title: "Available days",
              choices: [
                {
                  text: "Monday",
                  value: "monday",
                },
                {
                  text: "Tuesday",
                  value: "tuesday",
                },
                {
                  text: "Wednesday",
                  value: "wednesday",
                },
                {
                  text: "Thursday",
                  value: "thursday",
                },
                {
                  text: "Friday",
                  value: "friday",
                },
                {
                  text: "Saturday",
                  value: "saturday",
                },
                {
                  text: "Sunday",
                  value: "sunday",
                },
              ],
            },
            {
              name: "availabilityTimes",
              type: "comment",
              title: "Preferred times or scheduling notes",
            },
            {
              name: "referral",
              type: "dropdown",
              title: "How did you hear about us?",
              choices: [
                "Google search",
                "Social media",
                "Friend or family",
                "Flyer or poster",
                "Other",
              ],
            },
            {
              name: "consent",
              type: "boolean",
              title:
                "I agree to be contacted about lessons and to the studio's policies",
              isRequired: true,
            },
            {
              name: "additionalComments",
              type: "comment",
              title: "Additional comments or questions",
            },
          ],
        },
      ],
      title: "AI Generated Lesson",
      width: "800px",
      widthMode: "static",
      showQuestionNumbers: "off",
    };
    const result: ApiResult<DefineFormResponse> = ApiResult.success({
      agentResponse: "Yes, of course, I can help you with that.",
      agentId: chatContext?.agentId ?? "",
      threadId: chatContext?.threadId ?? "",
      definition: formDefinitionObj,
    });

    // const result = await defineFormAction({
    //   prompt,
    //   definition,
    //   threadId: chatContext?.threadId,
    //   formId: formId,
    // });

    if (result.success) {
      const promptResponse = result.data;
      const newChatContext = {
        ...chatContext,
        resultJson: promptResponse.definition
          ? JSON.stringify(promptResponse.definition)
          : undefined,
        messages: [
          ...chatContext.messages,
          {
            isAi: true,
            content: promptResponse.agentResponse,
          },
        ],
      };
      dispatch({
        type: ConversationActionType.SET_RESULT_JSON,
        payload: {
          definition: promptResponse.definition as object,
          agentResponse: promptResponse.agentResponse,
        },
      });
      return newChatContext;
    }

    return chatContext;
  };

  const assistantContext: FormAssistantContext = {
    chatContext,
    isAssistantEnabled,
    formId,
    sendPrompt,
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
