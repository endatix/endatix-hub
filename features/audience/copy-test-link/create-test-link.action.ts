"use server";

import { Permissions } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import { DEFAULT_EXPIRY_MINUTES } from "@/lib/share-links/share-link-expiry";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import {
  requireAudienceAccess,
  type AudienceAccess,
} from "../shared/require-audience-api.server";
import { testLinkExpiry } from "../shared/test-link-limits";
import { testLinkPath } from "../shared/test-link-path";
import {
  SHARE_SUBMISSION_PERMISSIONS,
  TEST_LINK_PERMISSIONS,
} from "../shared/test-link-access.server";

export type TestLink = { url: string; expiresAt: string };

/** Who the link is for: the route takes the membership, an older API reads the participant. */
export type TestLinkPerson = Pick<
  AudiencePerson,
  "audienceMemberId" | "membershipId"
>;

const NO_ACCESS =
  "You need permission to test and edit forms to copy a test link.";
const NO_SHARE_ACCESS =
  "This Endatix API also needs permission to view submissions to copy a test link.";
const NO_LINK = "No test link was created. Try again.";
const REAL_PERSON = "Test links are only for test participants.";

const LOG = {
  fallbackMessage: "Failed to copy a test link.",
  logMessage: "Failed to copy a test link.",
  loggerName: "audience.test-links.create",
} as const;

type MintRequest = {
  formId: string;
  submissionId: string;
  expiryMinutes: number;
};

type LinkRequest = {
  formId: string;
  person: TestLinkPerson;
  expiryMinutes: number;
};

/** The test links route: one run, all or nothing, and a real participant refused by the API. */
async function mintOneRun(
  api: EndatixApi,
  { formId, person, expiryMinutes }: LinkRequest,
): Promise<Result<TestLink>> {
  const minted = toResult(
    await api.audience.mintTestLinks(formId, {
      membershipIds: [person.membershipId],
      runsEach: 1,
      expiryMinutes: testLinkExpiry(expiryMinutes),
    }),
    LOG,
  );
  if (Result.isError(minted)) return minted;
  const [link] = minted.value;
  if (!link) return Result.error(NO_LINK);
  const url = testLinkPath(formId, link.token);
  return Result.success({ url, expiresAt: link.expiresAt });
}

/**
 * Older API: the test submission's id; a real participant gets none, since a link holder would see their values.
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

/**
 * An API without the test links route: open, then mint. When the token fails, the test
 * submission is deleted again and the token's error is returned.
 */
async function openAndMint(
  { api, checkAnyPermission }: AudienceAccess,
  { formId, person, expiryMinutes }: LinkRequest,
): Promise<Result<TestLink>> {
  const memberId = person.audienceMemberId;
  const share = await checkAnyPermission(SHARE_SUBMISSION_PERMISSIONS);
  if (!share.success) {
    return Result.error(NO_SHARE_ACCESS);
  }
  const opened = await openForTestPerson(api, formId, memberId);
  if (Result.isError(opened)) return opened;
  const submissionId = opened.value;
  const link = await mintLink(api, { formId, submissionId, expiryMinutes });
  if (Result.isError(link)) await rollBack(api, formId, submissionId);
  return link;
}

/**
 * Copy test link: a new test submission for a test participant, and a `submit` link to it that
 * opens without a login, also on a private form. An API without the test links route
 * (`supportsTestLinks`) gets the older open-then-mint path.
 */
export async function createTestLinkAction(
  formId: string,
  person: TestLinkPerson,
  expiryMinutes: number = DEFAULT_EXPIRY_MINUTES,
): Promise<Result<TestLink>> {
  const access = await requireAudienceAccess(Permissions.Forms.Test);
  if (Result.isError(access)) return access;
  const { api, checkAllPermissions } = access.value;
  const mint = await checkAllPermissions(TEST_LINK_PERMISSIONS);
  if (!mint.success) return Result.error(NO_ACCESS);
  const request = { formId, person, expiryMinutes };
  if (await api.audience.supportsTestLinks(formId)) {
    return mintOneRun(api, request);
  }
  return openAndMint(access.value, request);
}
