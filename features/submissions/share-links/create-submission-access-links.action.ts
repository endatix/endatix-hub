"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, type ResultType } from "@/lib/result";

const DEFAULT_EXPIRY_MINUTES = 60 * 24 * 7;

export interface SubmissionAccessLinksTokens {
  viewToken: string;
  editToken: string;
  exportToken: string;
  expiresAt: string;
}

export type CreateSubmissionAccessLinksResult =
  ResultType<SubmissionAccessLinksTokens>;

export async function createSubmissionAccessLinksAction(
  formId: string,
  submissionId: string,
  expiryMinutes = DEFAULT_EXPIRY_MINUTES,
): Promise<CreateSubmissionAccessLinksResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);

  const viewResult = await api.submissions.createAccessToken({
    formId,
    submissionId,
    expiryMinutes,
    permissions: ["view"],
  });

  if (!viewResult.success) {
    return Result.error("Failed to create view share link");
  }

  const editResult = await api.submissions.createAccessToken({
    formId,
    submissionId,
    expiryMinutes,
    permissions: ["view", "edit"],
  });

  if (!editResult.success) {
    return Result.error("Failed to create edit share link");
  }

  const exportResult = await api.submissions.createAccessToken({
    formId,
    submissionId,
    expiryMinutes,
    permissions: ["export"],
  });

  if (!exportResult.success) {
    return Result.error("Failed to create export share link");
  }

  return Result.success({
    viewToken: viewResult.data.token,
    editToken: editResult.data.token,
    exportToken: exportResult.data.token,
    expiresAt: viewResult.data.expiresAt,
  });
}
