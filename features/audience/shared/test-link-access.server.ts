import "server-only";

import { Permissions } from "@/features/auth/authorization";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceAccess } from "./require-audience-api.server";

/** The test links route's gate: both. */
export const TEST_LINK_PERMISSIONS = [
  Permissions.Forms.Test,
  Permissions.Forms.Edit,
];

/** An older API's gate for minting a submission access token: any one of these. */
export const SHARE_SUBMISSION_PERMISSIONS = [
  Permissions.Submissions.View,
  Permissions.Submissions.Edit,
  Permissions.Submissions.Export,
];

export type TestLinkAccess = {
  /** Copy test link on a test participant. */
  canCopyTestLink: boolean;
  /** The test links route answers this reader: Download test links. */
  canMintTestLinks: boolean;
};

const NONE: TestLinkAccess = { canCopyTestLink: false, canMintTestLinks: false };

type Checks = Pick<AudienceAccess, "checkAllPermissions" | "checkAnyPermission">;

/**
 * Which test link actions this reader gets. Only a reader with `forms.test` and `forms.edit`
 * costs a probe of the route. An older API without it keeps Copy test link for a reader with a
 * submissions grant, and hides Download test links.
 */
export async function testLinkAccess(
  api: EndatixApi,
  formId: string,
  { checkAllPermissions, checkAnyPermission }: Checks,
): Promise<TestLinkAccess> {
  const mint = await checkAllPermissions(TEST_LINK_PERMISSIONS);
  if (!mint.success) return NONE;
  if (await api.audience.supportsTestLinks(formId)) {
    return { canCopyTestLink: true, canMintTestLinks: true };
  }
  const share = await checkAnyPermission(SHARE_SUBMISSION_PERMISSIONS);
  return { canCopyTestLink: share.success, canMintTestLinks: false };
}
