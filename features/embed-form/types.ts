export interface EmbedMessageData {
  type: string;
  formId?: string;
  [key: string]: unknown;
}

export interface EndatixEmbedMessage {
  type: `endatix:${EmbedMessageType}`;
  formId?: string;
  url?: string;
  height?: number;
  submissionId?: string;
  success?: boolean;
  error?: string;
}

export type EmbedMessageType =
  | "resize"
  | "scroll"
  | "navigate"
  | "form-complete"
  | "form-error"
  | "form-loaded";

export interface EmbedBehaviorOptions {
  isEmbed: boolean;
  formId: string;
}
