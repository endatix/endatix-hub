import "server-only";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi, type ApiResult } from "@/lib/endatix-api";
import { onboardingFlag, saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result, toResult } from "@/lib/result";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";

export const guidePath = "/onboarding/my-guide";

export async function guideApi() {
  if (!(await saasManagementFlag()) || !(await onboardingFlag())) return null;
  const session = await auth();
  if (!session?.accessToken || session.error) return null;
  const { checkPermission } = await authorization(session);
  if (!(await checkPermission(Permissions.Access.Hub)).success) return null;
  return { api: new EndatixApi(session.accessToken), scope: workspaceScope(session.accessToken)! };
}

export function guideVisibility(response: ApiResult<{ isDismissed: boolean }>): Result<boolean> {
  const result = toResult(response, {
    fallbackMessage: "Could not load your guide preference.",
    loggerName: "onboarding.guide",
    logMessage: "Personal guide request failed",
  });
  if (Result.isError(result)) return result;
  if (typeof result.value?.isDismissed !== "boolean") return Result.error("Invalid guide preference.");
  return Result.success(result.value.isDismissed);
}
