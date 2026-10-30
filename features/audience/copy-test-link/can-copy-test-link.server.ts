import "server-only";

import { Permissions } from "@/features/auth/authorization";
import type { AudienceAccess } from "../shared/require-audience-api.server";

type CheckPermission = AudienceAccess["checkPermission"];

/** The test links route's gate: both. */
const TEST_LINK_PERMISSIONS = [Permissions.Forms.Test, Permissions.Forms.Edit];

/** An older API's gate for minting a submission access token: any one of these. */
const SHARE_SUBMISSION_PERMISSIONS = [
  Permissions.Submissions.View,
  Permissions.Submissions.Edit,
  Permissions.Submissions.Export,
];

const granted = async (check: CheckPermission, permissions: string[]) =>
  (await Promise.all(permissions.map((p) => check(p)))).map((c) => c.success);

/** `forms.test` and `forms.edit`: what the test links route asks for. */
export async function canMintTestLinks(
  checkPermission: CheckPermission,
): Promise<boolean> {
  const checks = await granted(checkPermission, TEST_LINK_PERMISSIONS);
  return checks.every(Boolean);
}

/** Any submissions grant: an older API's Copy test link mints the token on its own. */
export async function canShareSubmissions(
  checkPermission: CheckPermission,
): Promise<boolean> {
  const checks = await granted(checkPermission, SHARE_SUBMISSION_PERMISSIONS);
  return checks.some(Boolean);
}
