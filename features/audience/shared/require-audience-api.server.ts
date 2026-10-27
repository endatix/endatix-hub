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
  await requireAllPermissions(audienceGrants(permission));
  if (!(await personalizationFlag())) {
    return Result.error(PERSONALIZATION_DISABLED_MESSAGE);
  }
  return Result.success({
    api: new EndatixApi(session?.accessToken),
    checkPermission,
  });
}

/** The grant the participant page needs beyond Hub access: the API's own gate for reading one participant. */
export const PARTICIPANT_PAGE_PERMISSION = Permissions.Forms.Edit;

const audienceGrants = (permission: string) => [
  Permissions.Access.Hub,
  permission,
];

/**
 * Whether the signed-in viewer would pass `requireAudienceAccess(permission)`, without
 * redirecting: for a link elsewhere in the Hub that must not lead to a page that sends the
 * viewer away.
 */
export async function canAccessAudience(permission: string): Promise<boolean> {
  if (!(await personalizationFlag())) return false;
  const { checkAllPermissions } = await authorization(await auth());
  const allowed = await checkAllPermissions(audienceGrants(permission));
  return allowed.success;
}

export const AUDIENCE_ACCESS_DENIED_MESSAGE =
  "You no longer have access to this form's participants.";

/**
 * `requireAudienceApi` for a background read: a missing grant (or an expired session) is a
 * `Result` error, never a redirect, so the page the read runs under keeps its unsaved state.
 */
export async function checkAudienceApi(
  permission: string,
): Promise<ResultType<EndatixApi>> {
  if (!(await personalizationFlag())) {
    return Result.error(PERSONALIZATION_DISABLED_MESSAGE);
  }
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const allowed = await checkAllPermissions(audienceGrants(permission));
  if (!allowed.success) return Result.error(AUDIENCE_ACCESS_DENIED_MESSAGE);
  return Result.success(new EndatixApi(session?.accessToken));
}

/** `requireAudienceAccess` for callers that only need the API client. */
export async function requireAudienceApi(
  permission: string,
): Promise<ResultType<EndatixApi>> {
  const access = await requireAudienceAccess(permission);
  if (Result.isError(access)) return access;
  return Result.success(access.value.api);
}
