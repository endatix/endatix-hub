import "server-only";

import { Permissions } from "@/features/auth/authorization";
import type { AudienceAccess } from "../shared/require-audience-api.server";

/** The API's own gate for minting a submission access token: any one of these. */
const SHARE_SUBMISSION_PERMISSIONS = [
  Permissions.Submissions.View,
  Permissions.Submissions.Edit,
  Permissions.Submissions.Export,
];

/**
 * Copy test link needs `forms.test` to open the test submission and any submissions grant to
 * mint its link. Pages use it to hide the action the server would refuse.
 */
export async function canCopyTestLink(
  checkPermission: AudienceAccess["checkPermission"],
): Promise<boolean> {
  const [test, ...share] = await Promise.all(
    [Permissions.Forms.Test, ...SHARE_SUBMISSION_PERMISSIONS].map(
      (permission) => checkPermission(permission),
    ),
  );
  return test.success && share.some((check) => check.success);
}
