import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceAccess } from "../shared/require-audience-api.server";
import {
  canMintTestLinks,
  canShareSubmissions,
} from "./can-copy-test-link.server";

export type TestLinkAccess = {
  /** Copy test link on a test participant. */
  canCopyTestLink: boolean;
  /** The test links route answers this reader: Download test links. */
  canMintTestLinks: boolean;
};

const NONE: TestLinkAccess = {
  canCopyTestLink: false,
  canMintTestLinks: false,
};

/**
 * Which test link actions this reader gets. Only a reader with `forms.test` and `forms.edit`
 * costs a probe of the route. An older API without it keeps Copy test link for a reader with a
 * submissions grant, and hides Download test links.
 */
export async function testLinkAccess(
  api: EndatixApi,
  formId: string,
  checkPermission: AudienceAccess["checkPermission"],
): Promise<TestLinkAccess> {
  if (!(await canMintTestLinks(checkPermission))) return NONE;
  if (await api.audience.supportsTestLinks(formId)) {
    return { canCopyTestLink: true, canMintTestLinks: true };
  }
  const canCopyTestLink = await canShareSubmissions(checkPermission);
  return { canCopyTestLink, canMintTestLinks: false };
}
