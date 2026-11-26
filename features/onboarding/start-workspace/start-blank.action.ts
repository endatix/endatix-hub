"use server";

import { revalidatePath } from "next/cache";
import { Result } from "@/lib/result";
import { workspaceApi, workspaceResult, workspaceStartPath } from "./workspace-api.server";

export async function startBlank(scope: string) {
  return resumeWorkspace(scope, "blank");
}

export async function retryPreparation(scope: string) {
  return resumeWorkspace(scope, "retry");
}

async function resumeWorkspace(scope: string, action: "blank" | "retry") {
  const workspace = await workspaceApi();
  if (!workspace || (action === "retry" && !(await workspace.canRetry())))
    return Result.error("Workspace setup is not available for this account.");
  if (workspace.scope !== scope)
    return Result.error("Your session has changed. Refresh before starting your survey.");
  const result = workspaceResult(await workspace.api.post<unknown>(`${workspaceStartPath}/${action}`));
  if (Result.isSuccess(result)) revalidatePath("/forms");
  return result;
}
