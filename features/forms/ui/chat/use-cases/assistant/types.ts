export type ChatMessage = {
    id: string;
    isAi: boolean;
    content: string;
}

export type ChatContext = {
    conversationId?: string,
    agentId: string,
    threadId: string,
    messages: ChatMessage[],
    isInitialPrompt?: boolean,
    error?: string,
    resultJson?: string,
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