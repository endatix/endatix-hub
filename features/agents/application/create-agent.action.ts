"use server";

import { createAgent } from "@/services/ai-api";
import { Agent, agentSchema } from "@/features/agents/types";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";

export async function createAgentAction(
  formData: FormData,
): Promise<Result<Agent>> {
  try {
    const data = Object.fromEntries(formData.entries());
    const parsed = agentSchema.parse(data);
    const agent = await createAgent(parsed);
    
    revalidatePath("/admin/agents");
    return Result.success(agent);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return Result.error(error.message);
    }
    return Result.error("Failed to create agent");
  }
}
