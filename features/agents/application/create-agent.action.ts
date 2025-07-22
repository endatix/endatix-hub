"use server";

import { ensureAuthenticated, getSession } from "@/features/auth";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Agent, AgentRequestSchema } from "@/lib/endatix-api/agents/types";
import { revalidatePath } from "next/cache";

export async function createAgentAction(
  formData: FormData,
): Promise<ApiResult<Agent>> {
  ensureAuthenticated();

  const data = Object.fromEntries(formData.entries());
  const parsed = AgentRequestSchema.parse(data);
  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const createAgentResult = await endatixApi.agents.create(parsed);

  if (ApiResult.isSuccess(createAgentResult)) {
    revalidatePath("/admin/agents");
  }

  return createAgentResult;
}
