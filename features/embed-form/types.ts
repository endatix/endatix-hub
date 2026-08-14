export type EmbedMessageType =
  | "resize"
  | "scroll"
  | "navigate"
  | "form-complete"
  | "form-error"
  | "form-loaded";

export interface EmbedMessagingContext {
  embedId?: string;
  parentOrigin?: string;
  heightMode?: "auto" | "fill";
}

export interface EmbedFormInfo {
  formId: string;
  definitionId: string;
  limitOnePerUser: boolean;
  requiresReCaptcha: boolean;
  metadata?: string;
}

export interface EmbedLoadedPayload extends EmbedFormInfo {
  title?: string;
}

export interface EmbedCompletePayload {
  formId: string;
  submissionId: string;
  success: true;
  isComplete?: boolean;
  status?: string;
  completedAt?: string;
}

export interface EmbedErrorPayload {
  formId: string;
  success: false;
  error: {
    type?: string;
    code?: string;
    message: string;
  };
}

export interface EmbedNavigatePayload {
  formId: string;
  url: string;
}

export interface EmbedResizePayload {
  formId?: string;
  height: number;
}

export interface EmbedMessagePayloadMap {
  resize: EmbedResizePayload;
  scroll: { formId: string };
  navigate: EmbedNavigatePayload;
  "form-loaded": EmbedLoadedPayload;
  "form-complete": EmbedCompletePayload;
  "form-error": EmbedErrorPayload;
}

export type EmbedMessagePayload<T extends EmbedMessageType> =
  EmbedMessagePayloadMap[T];

export type EndatixEmbedMessage<T extends EmbedMessageType = EmbedMessageType> =
  {
    type: `endatix:${T}`;
    embedId?: string;
  } & EmbedMessagePayload<T>;

export interface EmbedBehaviorOptions {
  isEmbed: boolean;
  formId: string;
  embedForm?: EmbedFormInfo;
}
