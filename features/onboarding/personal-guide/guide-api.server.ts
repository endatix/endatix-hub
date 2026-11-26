import "server-only";
import type { Session } from "next-auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi, type ApiResult } from "@/lib/endatix-api";
import { onboardingFlag, saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result, toResult } from "@/lib/result";

export const guidePath = "/onboarding/my-guide";

export async function guideApi(session: Session | null) {
  if (!(await saasManagementFlag()) || !(await onboardingFlag())) return null;
  if (!session?.accessToken || session.error) return null;
  const { checkPermission, getAuthorizationData } = await authorization(session);
  if (!(await checkPermission(Permissions.Access.Hub)).success) return null;
  const member = await getAuthorizationData();
  if (!member.success) return null;
  const scope = `${member.data.tenantId}:${member.data.userId}`;
  return { api: new EndatixApi(session.accessToken), scope };
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
