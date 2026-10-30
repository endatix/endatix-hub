"use server";

import { Permissions } from "@/features/auth/authorization";
import type { MintTestLinksRequest } from "@/lib/endatix-api/audience/types";
import { clampExpiryMinutes } from "@/lib/share-links/share-link-expiry";
import { Result, toResult } from "@/lib/result";
import { canMintTestLinks } from "../copy-test-link/can-copy-test-link.server";
import { requireAudienceAccess } from "../shared/require-audience-api.server";
import type { TestLinkRow } from "./test-links-file";

const MIN_RUNS = 1;
const MAX_RUNS = 10;
const MIN_EXPIRY_MINUTES = 60;

const NO_ACCESS =
  "You need permission to test and edit forms to download test links.";

const LOG = {
  fallbackMessage: "Failed to download test links.",
  logMessage: "Failed to download test links.",
  loggerName: "audience.test-links.download",
} as const;

const clampRuns = (runs: number) =>
  Number.isFinite(runs)
    ? Math.min(MAX_RUNS, Math.max(MIN_RUNS, Math.floor(runs)))
    : MIN_RUNS;

/** The route's ranges, so a stale form value never reaches it as a 400. */
const withinRange = (request: MintTestLinksRequest): MintTestLinksRequest => ({
  membershipIds: request.membershipIds,
  runsEach: clampRuns(request.runsEach),
  expiryMinutes: Math.max(
    MIN_EXPIRY_MINUTES,
    clampExpiryMinutes(request.expiryMinutes),
  ),
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
  const { api, checkPermission } = access.value;
  if (!(await canMintTestLinks(checkPermission))) {
    return Result.error(NO_ACCESS);
  }

  const minted = toResult(
    await api.audience.mintTestLinks(formId, withinRange(request)),
    LOG,
  );
  if (Result.isError(minted)) return minted;
  return Result.success(
    minted.value.map(({ identifier, run, token, expiresAt }) => ({
      identifier,
      run,
      token,
      expiresAt,
    })),
  );
}
