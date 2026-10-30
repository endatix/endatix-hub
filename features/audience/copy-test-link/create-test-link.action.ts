"use server";

import { Permissions } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import {
  clampExpiryMinutes,
  DEFAULT_EXPIRY_MINUTES,
} from "@/lib/share-links/share-link-expiry";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { ApiErrorType, ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import {
  requireAudienceAccess,
  type AudienceAccess,
} from "../shared/require-audience-api.server";
import { testLinkPath } from "./test-link-path";
import {
  canMintTestLinks,
  canShareSubmissions,
} from "./can-copy-test-link.server";

export type TestLink = { url: string; expiresAt: string };

/** Who the link is for: the route takes the membership, an older API reads the participant. */
export type TestLinkPerson = Pick<
  AudiencePerson,
  "audienceMemberId" | "membershipId"
>;

const MIN_EXPIRY_MINUTES = 60;

const NO_ACCESS =
  "You need permission to test and edit forms to copy a test link.";
const NO_SHARE_ACCESS =
  "This Endatix API also needs permission to view submissions to copy a test link.";
const REAL_PERSON = "Test links are only for test participants.";

const LOG = {
  fallbackMessage: "Failed to copy a test link.",
  logMessage: "Failed to copy a test link.",
  loggerName: "audience.test-links.create",
} as const;

const testLinkExpiry = (minutes: number) =>
  Math.max(MIN_EXPIRY_MINUTES, clampExpiryMinutes(minutes));

type MintRequest = {
  formId: string;
  submissionId: string;
  expiryMinutes: number;
};

/** The test links route: one run, all or nothing, and a real participant refused by the API. */
async function mintOneRun(
  api: EndatixApi,
  formId: string,
  { membershipId }: TestLinkPerson,
  expiryMinutes: number,
): Promise<ApiResult<TestLink>> {
  const minted = await api.audience.mintTestLinks(formId, {
    membershipIds: [membershipId],
    runsEach: 1,
    expiryMinutes: testLinkExpiry(expiryMinutes),
  });
  if (!minted.success) return minted;
  const [link] = minted.data;
  if (!link) return ApiResult.notFoundError("No test link was created.");
  return ApiResult.success({
    url: testLinkPath(formId, link.token),
    expiresAt: link.expiresAt,
  });
}

/**
 * Older API: the test submission's id; a real person gets none, since a link holder would see their values.
 * This rule holds for this action only: the API opens a test submission for anyone, and Share
 * Submission can still share one opened with Test as this participant.
 */
async function openForTestPerson(
  api: EndatixApi,
  formId: string,
  memberId: string,
): Promise<Result<string>> {
  const person = toResult(
    await api.audience.getParticipant(formId, memberId),
    LOG,
  );
  if (Result.isError(person)) return person;
  if (!person.value.isTest) return Result.error(REAL_PERSON);

  const opened = toResult(
    await api.audience.openTestSubmission(formId, person.value.membershipId),
    LOG,
  );
  if (Result.isError(opened)) return opened;
  return Result.success(opened.value.submissionId);
}

/** A `submit` token: the guest fills in and completes this one submission, and edits nothing after. */
async function mintLink(
  api: EndatixApi,
  { formId, submissionId, expiryMinutes }: MintRequest,
): Promise<Result<TestLink>> {
  const minted = toResult(
    await api.submissions.createAccessToken({
      formId,
      submissionId,
      expiryMinutes: testLinkExpiry(expiryMinutes),
      permissions: ["submit"],
    }),
    LOG,
  );
  if (Result.isError(minted)) return minted;
  const { token, expiresAt } = minted.value;
  return Result.success({ url: testLinkPath(formId, token), expiresAt });
}

/**
 * Deletes the test submission a failed mint left without a link. A failed delete is logged by
 * ids and error code only, so a leftover can be found.
 */
async function rollBack(api: EndatixApi, formId: string, submissionId: string) {
  const deleted = await api.submissions.delete(formId, submissionId);
  if (ApiResult.isSuccess(deleted)) return;
  TelemetryLogger.error(
    "Failed to delete a test submission after its test link failed",
    undefined,
    { formId, submissionId, errorCode: deleted.error.errorCode },
    LOG.loggerName,
  );
}

type LegacyRequest = {
  formId: string;
  memberId: string;
  expiryMinutes: number;
};

/**
 * An API without the test links route: open, then mint. When the token fails, the test
 * submission is deleted again and the token's error is returned.
 */
async function openAndMint(
  { api, checkPermission }: AudienceAccess,
  { formId, memberId, expiryMinutes }: LegacyRequest,
): Promise<Result<TestLink>> {
  if (!(await canShareSubmissions(checkPermission))) {
    return Result.error(NO_SHARE_ACCESS);
  }
  const opened = await openForTestPerson(api, formId, memberId);
  if (Result.isError(opened)) return opened;
  const submissionId = opened.value;
  const link = await mintLink(api, { formId, submissionId, expiryMinutes });
  if (Result.isError(link)) await rollBack(api, formId, submissionId);
  return link;
}

const routeMissing = (result: ApiResult<TestLink>) =>
  !result.success && result.error.type === ApiErrorType.NotFoundError;

/**
 * Copy test link: a new test submission for a test person, and a `submit` link to it that
 * opens without a login, also on a private form. A 404 from the test links route is an older
 * API, or a participant or form it cannot find; either way the older path answers it.
 */
export async function createTestLinkAction(
  formId: string,
  person: TestLinkPerson,
  expiryMinutes: number = DEFAULT_EXPIRY_MINUTES,
): Promise<Result<TestLink>> {
  const access = await requireAudienceAccess(Permissions.Forms.Test);
  if (Result.isError(access)) return access;
  if (!(await canMintTestLinks(access.value.checkPermission))) {
    return Result.error(NO_ACCESS);
  }

  const minted = await mintOneRun(
    access.value.api,
    formId,
    person,
    expiryMinutes,
  );
  if (!routeMissing(minted)) return toResult(minted, LOG);
  const memberId = person.audienceMemberId;
  return openAndMint(access.value, { formId, memberId, expiryMinutes });
}
