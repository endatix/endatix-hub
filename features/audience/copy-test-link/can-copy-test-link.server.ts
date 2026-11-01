import "server-only";

import { Permissions } from "@/features/auth/authorization";
import type { AudienceAccess } from "../shared/require-audience-api.server";

/** The API's own gate for minting a submission access token: any one of these. */
const SHARE_SUBMISSION_PERMISSIONS = [
  Permissions.Submissions.View,
  Permissions.Submissions.Edit,
  Permissions.Submissions.Export,
];

/** Open the test submission, and read the participant (the API's gate) to refuse a real one. */
const REQUIRED_PERMISSIONS = [Permissions.Forms.Test, Permissions.Forms.Edit];

/**
 * Copy test link needs `forms.test` to open the test submission, `forms.edit` to read the
 * participant, and any submissions grant to mint its link. Pages use it to hide the action the
 * server would refuse.
 */
export async function canCopyTestLink(
  checkPermission: AudienceAccess["checkPermission"],
): Promise<boolean> {
  const all = [...REQUIRED_PERMISSIONS, ...SHARE_SUBMISSION_PERMISSIONS];
  const checks = await Promise.all(all.map((p) => checkPermission(p)));
  const required = checks.slice(0, REQUIRED_PERMISSIONS.length);
  const share = checks.slice(REQUIRED_PERMISSIONS.length);
  return required.every((c) => c.success) && share.some((c) => c.success);
}
