import "server-only";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { personalizationFlag } from "@/lib/feature-flags";
import { Result, type ResultType } from "@/lib/result";

export const PERSONALIZATION_DISABLED_MESSAGE =
  "Personalization is not enabled for this environment.";

type AuthorizationService = Awaited<ReturnType<typeof authorization>>;

export type AudienceAccess = {
  api: EndatixApi;
  /** For capability checks that must not redirect, such as hiding a control. */
  checkPermission: AuthorizationService["checkPermission"];
};

/**
 * Audience server gate. `permission` is the extra grant beyond Hub access
 * (`forms.view` to read, `forms.edit` or `tenant.settings.manage` to write).
 * A missing grant redirects. The flag off is a `Result` error: the page redirects,
 * an action shows the message. The page reuses `checkPermission` from the same
 * authorization pass to decide which controls to show.
 */
export async function requireAudienceAccess(
  permission: string,
): Promise<ResultType<AudienceAccess>> {
  const session = await auth();
  const { requireAllPermissions, checkPermission } =
    await authorization(session);
  await requireAllPermissions([Permissions.Access.Hub, permission]);
  if (!(await personalizationFlag())) {
    return Result.error(PERSONALIZATION_DISABLED_MESSAGE);
  }
  return Result.success({
    api: new EndatixApi(session?.accessToken),
    checkPermission,
  });
}

/** `requireAudienceAccess` for callers that only need the API client. */
export async function requireAudienceApi(
  permission: string,
): Promise<ResultType<EndatixApi>> {
  const access = await requireAudienceAccess(permission);
  if (Result.isError(access)) return access;
  return Result.success(access.value.api);
}
