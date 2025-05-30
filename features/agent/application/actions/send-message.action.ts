'use server';

import { sendAgentMessage, type AgentMessage, type AgentResponse } from "@/services/api";

export async function sendAgentMessageAction(message: AgentMessage): Promise<AgentResponse> {
  return sendAgentMessage(message);
} 