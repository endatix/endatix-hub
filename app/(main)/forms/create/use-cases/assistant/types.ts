export type Message = {
    isAi: boolean;
    content: string;
}

export type ChatContext = {
    agentId: string,
    threadId: string,
    messages: Message[],
    isInitialPrompt?: boolean,
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