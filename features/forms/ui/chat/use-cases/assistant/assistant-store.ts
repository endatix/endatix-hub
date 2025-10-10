import { ChatContext } from "./types";

const KEYS = {
    CHAT_CONTEXT: (formId?: string) =>
        formId ? `edx_context_chat_${formId}` : 'edx_context_chat',
    FORM_JSON: (formId?: string) =>
        formId ? `edx_context_form_${formId}` : 'edx_context_form'
};

export class AssistantStore {
    private storage: Storage;

    constructor() {
        this.storage = localStorage;
    }

    /**
     * Get chat context from localStorage
     * Note: For Form Designer with formId, context should be fetched via server action
     */
    public getChatContext(formId?: string): ChatContext {
        return this.getItem<ChatContext>(KEYS.CHAT_CONTEXT(formId));
    }

    /**
     * Set chat context in localStorage
     * Note: For Form Designer with formId, context is persisted via backend /define endpoint
     */
    public setChatContext(context: ChatContext, formId?: string): void {
        this.storeItem(KEYS.CHAT_CONTEXT(formId), context);
    }

    // Keep these for Create Form flow only
    public getFormModel(formId?: string): string | null {
        if (formId) return null; // Not used for Form Designer
        return this.getItem<string>(KEYS.FORM_JSON());
    }

    public setFormModel(form: string, formId?: string): void {
        if (!formId) {
            this.storeItem<string>(KEYS.FORM_JSON(), form);
        }
        // For Form Designer: not needed
    }

    public clear(formId?: string): void {
        if (!formId) {
            this.removeItem(KEYS.CHAT_CONTEXT());
            this.removeItem(KEYS.FORM_JSON());
        }
        // For Form Designer: no local storage to clear
    }

    private storeItem<T>(key: string, value: T): void {
        this.storage.setItem(key, JSON.stringify(value));
    }

    private getItem<T>(key: string): T {
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : null as T;
    }

    private removeItem(key: string): void {
        this.storage.removeItem(key);
    }
}
