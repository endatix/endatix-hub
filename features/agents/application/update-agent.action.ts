"use server";

import { Result } from "@/lib/result";
import { getSession } from "@/features/auth";
import { HeaderBuilder } from "@/services/header-builder";
import { AI_API_BASE_URL } from "@/services/ai-api";
import { revalidatePath } from 'next/cache';

export async function updateAgentAction(
  agentId: string | number,
  formData: FormData,
): Promise<Result<unknown>> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Result.error("Not authenticated");
  }
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const body = JSON.stringify(Object.fromEntries(formData.entries()));
  const response = await fetch(`${AI_API_BASE_URL}/agents/${agentId}`, {
    method: "PUT",
    headers,
    body,
  });
  if (!response.ok) {
    const error = await response.text();
    return Result.error(error || "Failed to update agent");
  }

  revalidatePath("/admin/agents");

  return Result.success(await response.json());
}
