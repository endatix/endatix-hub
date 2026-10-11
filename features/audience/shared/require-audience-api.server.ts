import "server-only";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { personalizationFlag } from "@/lib/feature-flags";
import { Result, type ResultType } from "@/lib/result";

export const PERSONALIZATION_DISABLED_MESSAGE =
  "Personalization is not enabled for this environment.";

/**
 * Audience server gate. `permission` is the extra grant beyond Hub access
 * (`forms.view` to read, `forms.edit` or `tenant.settings.manage` to write).
 * A missing grant redirects. The flag off is a `Result` error: the page redirects,
 * an action shows the message. Capability checks that must not redirect
 * (`checkPermission` for the match key) stay at the call site.
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
