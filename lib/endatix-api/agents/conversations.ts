import { EndatixApi } from "../endatix-api";
import { ApiResult, Conversation } from '../types';

export class Conversations {
  constructor(private readonly endatix: EndatixApi) {}

  async list(agentId: string): Promise<ApiResult<Conversation[]>> {
    return this.endatix.get<Conversation[]>(`/agents/${agentId}/conversations`);
  }
}