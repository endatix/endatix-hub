"use server";

import { cookies } from "next/headers";
import { Permissions } from "@/features/auth/authorization";
import { FormTokenCookieStore } from "@/features/public-form/server";
import { withBasePath } from "@/lib/hosting";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

export type OpenedTestSubmissionLink = { url: string };

const OPEN_LOG = {
  permission: Permissions.Forms.Test,
  fallbackMessage: "Failed to open a test submission.",
  logMessage: "Failed to open a test submission.",
  loggerName: "audience.test-submissions.open",
} as const;

/**
 * Test as this participant: opens a new test submission and keeps its token in the form cookie, the
 * same store the personalized-link route writes, so `/share/{formId}` opens it.
 */
export async function openTestSubmissionAction(
  formId: string,
  membershipId: string,
): Promise<Result<OpenedTestSubmissionLink>> {
  const opened = await withHubAudienceApi(
    (api) => api.audience.openTestSubmission(formId, membershipId),
    OPEN_LOG,
  );
  if (Result.isError(opened)) return opened;

  const store = new FormTokenCookieStore(await cookies());
  const stored = store.setToken({ formId, token: opened.value.token });
  if (Result.isError(stored)) return stored;
  return Result.success({ url: withBasePath(`/share/${formId}`) });
}
