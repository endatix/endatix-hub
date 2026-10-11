import "server-only";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { personalizationFlag } from "@/lib/feature-flags";
import { Result, type ResultType } from "@/lib/result";

export const PERSONALIZATION_DISABLED_MESSAGE =
  "Personalization is not enabled for this environment.";

/**
 * Hub access, the named permission, and the `personalization` flag. The API still enforces
 * its own permission; this is the Hub check so a missing grant never reaches it.
 * Missing Hub access or the permission redirects, like `requirePermission`.
 */
export async function requireAudienceApi(
  permission: string,
): Promise<ResultType<EndatixApi>> {
  const session = await auth();
  const { requireAllPermissions } = await authorization(session);
  await requireAllPermissions([Permissions.Access.Hub, permission]);
  if (!(await personalizationFlag())) {
    return Result.error(PERSONALIZATION_DISABLED_MESSAGE);
  }
  return Result.success(new EndatixApi(session?.accessToken));
}
