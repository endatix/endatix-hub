import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult, Conversation } from "../types";
import { Result } from "@/lib/result";

export class AgentConversations {
  constructor(private readonly endatix: EndatixApi) {}

  async list(agentId: string): Promise<ApiResult<Conversation[]>> {
    return this.endatix.get<Conversation[]>(`/agents/${agentId}/conversations`);
  }

  async get(
    agentId: string,
    conversationId: string,
  ): Promise<ApiResult<Conversation>> {
    const validateAgentIdResult = validateEndatixId(agentId, "agentId");
    if (Result.isError(validateAgentIdResult)) {
      return ApiResult.validationError(validateAgentIdResult.message);
    }

    const validateConversationIdResult = validateEndatixId(
      conversationId,
      "conversationId",
    );
    if (Result.isError(validateConversationIdResult)) {
      return ApiResult.validationError(validateConversationIdResult.message);
    }

    return this.endatix.get<Conversation>(
      `/agents/${validateAgentIdResult.value}/conversations/${validateConversationIdResult.value}`,
    );
  }
}
