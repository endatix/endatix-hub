"use server";

import { ensureAuthenticated, getSession } from "@/features/auth";
import { Agent, AgentRequestSchema, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export async function updateAgentAction(
  agentId: string,
  formData: FormData,
): Promise<ApiResult<Agent>> {
  ensureAuthenticated();

  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  
  const data = Object.fromEntries(formData.entries());
  const parsed = AgentRequestSchema.parse(data);

  const updateAgentResult = await endatixApi.agents.update(agentId, parsed);

  if (ApiResult.isSuccess(updateAgentResult)) {
    revalidatePath("/(main)/admin/agents");
  }

  return updateAgentResult;
}
