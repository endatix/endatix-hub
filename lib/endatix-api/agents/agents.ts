import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../types";
import { Conversations } from "./conversations";
import {
  Agent,
  CreateAgentRequest,
  DefineFormRequest,
  DefineFormResponse,
  UpdateAgentRequest,
} from "./types";

export default class Agents {
  private _conversations?: Conversations;

  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Conversations API methods
   */
  get conversations(): Conversations {
    if (!this._conversations) {
      this._conversations = new Conversations(this.endatix);
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
    return this.endatix.get<Agent>(`/agents/${agentId}`);
  }

  async create(request: CreateAgentRequest): Promise<ApiResult<Agent>> {
    return this.endatix.post<Agent>("/agents", request);
  }

  async update(
    agentId: string,
    request: UpdateAgentRequest,
  ): Promise<ApiResult<Agent>> {
    return this.endatix.put<Agent>(`/agents/${agentId}`, request);
  }
}
