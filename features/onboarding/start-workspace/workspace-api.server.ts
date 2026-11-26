import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi, type ApiResult } from "@/lib/endatix-api";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result, toResult } from "@/lib/result";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { readWorkspaceChoice, type WorkspaceChoice } from "./workspace-choice";

export const workspaceStartPath = "/onboarding/workspace-start";
const permissions = [
  Permissions.Access.Hub,
  Permissions.Forms.View,
  Permissions.Forms.Edit,
  Permissions.Forms.Create,
];

export async function workspaceApi() {
  if (!(await saasManagementFlag())) return null;
  const session = await auth();
  if (!session?.accessToken || session.error) return null;
  const { checkAllPermissions } = await authorization(session);
  if (!(await checkAllPermissions(permissions)).success) return null;
  const canRetry = async () =>
    (await checkAllPermissions([Permissions.Themes.Create, Permissions.Themes.View])).success;
  return { api: new EndatixApi(session.accessToken), scope: workspaceScope(session.accessToken)!, canRetry };
}

export function workspaceResult(response: ApiResult<unknown>): Result<WorkspaceChoice> {
  const result = toResult(response, {
    fallbackMessage: "Could not confirm your workspace setup.",
    logMessage: "Workspace setup request failed",
    loggerName: "onboarding.workspace",
  });
  if (Result.isError(result)) return result;
  const choice = readWorkspaceChoice(result.value);
  return choice
    ? Result.success(choice)
    : Result.error("Your workspace setup could not be read. Refresh to try again.");
}

export const currentWorkspaceStart = cache(async () => {
  try {
    const workspace = await workspaceApi();
    if (!workspace) return null;
    const result = workspaceResult(await workspace.api.get<unknown>(workspaceStartPath));
    return { workspace, result };
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
});

export async function canResumeWorkspaceSetup() {
  const current = await currentWorkspaceStart();
  return !!current && Result.isSuccess(current.result) && current.result.value.kind !== "complete";
}
