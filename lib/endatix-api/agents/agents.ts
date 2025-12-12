import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../types";
import { AgentConversations } from "./conversations";
import {
  Agent,
  CreateAgentRequest,
  DefineFormRequest,
  DefineFormResponse,
  UpdateAgentRequest,
} from "./types";
import { Result } from "@/lib/result";

export default class Agents {
  private _conversations?: AgentConversations;

  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Conversations API methods
   */
  get conversations(): AgentConversations {
    if (!this._conversations) {
      this._conversations = new AgentConversations(this.endatix);
    }
    return this._conversations;
  }

  async defineForm(
    request: DefineFormRequest,
  ): Promise<ApiResult<DefineFormResponse>> {
    return this.endatix.post<DefineFormResponse>(
      "/agents/forms/define",
      request,
    );
  }

  async list(): Promise<ApiResult<Agent[]>> {
    return this.endatix.get<Agent[]>("/agents");
  }

  async get(agentId: string): Promise<ApiResult<Agent>> {
    const validateAgentIdResult = validateEndatixId(agentId, "agentId");
    if (Result.isError(validateAgentIdResult)) {
      return ApiResult.validationError(validateAgentIdResult.message);
    }
    return this.endatix.get<Agent>(`/agents/${validateAgentIdResult.value}`);
  }

  async create(request: CreateAgentRequest): Promise<ApiResult<Agent>> {
    return this.endatix.post<Agent>("/agents", request);
  }

  async update(
    agentId: string,
    request: UpdateAgentRequest,
  ): Promise<ApiResult<Agent>> {
    const validateAgentIdResult = validateEndatixId(agentId, "agentId");
    if (Result.isError(validateAgentIdResult)) {
      return ApiResult.validationError(validateAgentIdResult.message);
    }

    return this.endatix.put<Agent>(
      `/agents/${validateAgentIdResult.value}`,
      request,
    );
  }
}
