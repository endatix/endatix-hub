"use server";

import { Result } from "@/lib/result";
import { workspaceApi, workspaceResult, workspaceStartPath } from "./workspace-api.server";

export async function preparationChanged(scope: string): Promise<boolean> {
  const workspace = await workspaceApi();
  if (!workspace || workspace.scope !== scope) return true;
  const result = workspaceResult(await workspace.api.get<unknown>(workspaceStartPath));
  if (Result.isSuccess(result)) return result.value.kind !== "working";
  return !!result.requiredAction || result.statusCode === 403 || result.statusCode === 404;
}
