export type ChatMessage = {
    isAi: boolean;
    content: string;
}

export type ChatContext = {
    conversationId?: number,
    agentId: string,
    threadId: string,
    messages: ChatMessage[],
    isInitialPrompt?: boolean,
    error?: string,
};

export interface DefineFormContext {
    assistantResponse: string,
    definition?: string,
    assistantId?: string,
    threadId: string
}

export interface CreateFormRequest {
    name: string,
    description: string,
    isEnabled: boolean,
    formDefinitionJsonData: string
}