import { z } from "zod";

export interface Agent {
  id: number;
  tenantId: number;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  createdAt: string;
  modifedAt: string;
  conversationsCount: number;
}

export const AgentRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.coerce.number().min(0, "Min 0").max(2, "Max 2"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  tenantId: z.coerce.number().int("TenantId must be an integer"),
});

export type CreateUpdateAgentRequestSchema = z.infer<typeof AgentRequestSchema>;
export type CreateAgentRequest = z.infer<typeof AgentRequestSchema>;
export type UpdateAgentRequest = Omit<
  z.infer<typeof AgentRequestSchema>,
  "tenantId" | "name"
>;

export interface Conversation {
  id: string;
  agentId: string;
  userId: string;
  resultJson: string | null;
  title: string | null;
  result: string | null;
  createdAt: string;
  modifiedAt: string;
  messageCount: number;
  messages: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenUsage: string | null;
  metadataJson: string | null;
  createdAt: Date;
  modifiedAt?: Date;
  deletedAt?: Date;
  sequence: number;
  isDeleted: boolean;
}

export type MessageRole = "system" | "user" | "assistant" | "tool";

export const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  model: z.string(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const DefineFormRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  threadId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  formId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  definition: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type DefineFormRequest = z.infer<typeof DefineFormRequestSchema>;

export interface DefineFormResponse {
  userPrompt: {
    id: string;
    content: string;
  };
  agentResponse: {
    id: string;
    content: string;
    definition: string;
  };
  agentId: string;
  threadId: string;
}
