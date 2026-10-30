"use server";

import { Permissions } from "@/features/auth/authorization";
import type {
  MintedTestLink,
  MintTestLinksRequest,
} from "@/lib/endatix-api/audience/types";
import { Result, toResult } from "@/lib/result";
import { requireAudienceAccess } from "../shared/require-audience-api.server";
import { TEST_LINK_PERMISSIONS } from "../shared/test-link-access.server";
import { clampRuns, testLinkExpiry } from "../shared/test-link-limits";
import type { TestLinkRow } from "./test-links-file";

const NO_ACCESS =
  "You need permission to test and edit forms to download test links.";

const LOG = {
  fallbackMessage: "Failed to download test links.",
  logMessage: "Failed to download test links.",
  loggerName: "audience.test-links.download",
} as const;

/** The route's ranges, so a stale form value never reaches it as a 400. */
const withinRange = (request: MintTestLinksRequest): MintTestLinksRequest => ({
  membershipIds: request.membershipIds,
  runsEach: clampRuns(request.runsEach),
  expiryMinutes: testLinkExpiry(request.expiryMinutes),
});

/** The file needs whose link it is, which run, and the token; not the ids. */
const toRow = ({ identifier, run, token, expiresAt }: MintedTestLink) => ({
  identifier,
  run,
  token,
  expiresAt,
});

/**
 * Download test links: `runsEach` new test submissions for each Test participant asked for
 * (`null` is all of them), each with a `submit` link. The API opens all or none.
 */
export async function downloadTestLinksAction(
  formId: string,
  request: MintTestLinksRequest,
): Promise<Result<TestLinkRow[]>> {
  const access = await requireAudienceAccess(Permissions.Forms.Test);
  if (Result.isError(access)) return access;
  const { api, checkAllPermissions } = access.value;
  const mint = await checkAllPermissions(TEST_LINK_PERMISSIONS);
  if (!mint.success) return Result.error(NO_ACCESS);

  const minted = toResult(
    await api.audience.mintTestLinks(formId, withinRange(request)),
    LOG,
  );
  if (Result.isError(minted)) return minted;
  return Result.success(minted.value.map((link) => toRow(link)));
}
