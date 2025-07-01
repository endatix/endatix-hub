import { z } from 'zod';

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
  
export const agentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.coerce.number().min(0, 'Min 0').max(2, 'Max 2'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  tenantId: z.coerce.number().int('TenantId must be an integer'),
});

export type CreateAgentRequest = z.infer<typeof agentSchema>;
export type AgentForm = CreateAgentRequest;

export interface Conversation {
  agentId: number;
  userId: number;
  title: string | null;
  result: string | null;
  createdAt: string;
  modifiedAt: string;
  messagesCount: number;
  }