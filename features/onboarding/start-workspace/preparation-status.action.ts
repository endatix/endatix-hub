"use server";

import { Result } from "@/lib/result";
import { workspaceApi, workspaceResult, workspaceStartPath } from "./workspace-api.server";

export async function readPreparation(scope: string) {
  const workspace = await workspaceApi();
  if (!workspace || workspace.scope !== scope)
    return Result.error<never>("Refresh to check your current workspace.", undefined, undefined, { statusCode: 403 });
  return workspaceResult(await workspace.api.get<unknown>(workspaceStartPath));
}
