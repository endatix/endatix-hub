"use server";

import { Permissions } from "@/features/auth/authorization";
import {
  clampExpiryMinutes,
  DEFAULT_EXPIRY_MINUTES,
} from "@/lib/share-links/share-link-expiry";
import type { EndatixApi } from "@/lib/endatix-api";
import { withBasePath } from "@/lib/hosting";
import { Result, toResult } from "@/lib/result";
import { requireAudienceAccess } from "../shared/require-audience-api.server";
import { canCopyTestLink } from "./can-copy-test-link.server";

export type TestLink = { url: string; expiresAt: string };

const MIN_EXPIRY_MINUTES = 60;

const NO_ACCESS =
  "You need permission to test and edit forms, and to view submissions, to copy a test link.";
const REAL_PERSON = "Test links are only for test participants.";

const LOG = {
  fallbackMessage: "Failed to copy a test link.",
  logMessage: "Failed to copy a test link.",
  loggerName: "audience.test-links.create",
} as const;

const testLinkExpiry = (minutes: number) =>
  Math.max(MIN_EXPIRY_MINUTES, clampExpiryMinutes(minutes));

/**
 * The test submission's id; a real person gets none, since a link holder would see their values.
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

type MintRequest = {
  formId: string;
  submissionId: string;
  expiryMinutes: number;
};

const shareUrl = (formId: string, token: string) =>
  withBasePath(`/share/${formId}?${new URLSearchParams({ token })}`);

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
  return Result.success({ url: shareUrl(formId, token), expiresAt });
}

/**
 * Copy test link: a new test submission for a test person, and a `submit` link to it that
 * opens without a login, also on a private form. The two calls are not atomic: when the token
 * fails, the test submission stays, and Delete test submissions removes it.
 */
export async function createTestLinkAction(
  formId: string,
  memberId: string,
  expiryMinutes: number = DEFAULT_EXPIRY_MINUTES,
): Promise<Result<TestLink>> {
  const access = await requireAudienceAccess(Permissions.Forms.Test);
  if (Result.isError(access)) return access;
  const { api, checkPermission } = access.value;
  if (!(await canCopyTestLink(checkPermission))) {
    return Result.error(NO_ACCESS);
  }

  const submissionId = await openForTestPerson(api, formId, memberId);
  if (Result.isError(submissionId)) return submissionId;
  return mintLink(api, {
    formId,
    submissionId: submissionId.value,
    expiryMinutes,
  });
}
