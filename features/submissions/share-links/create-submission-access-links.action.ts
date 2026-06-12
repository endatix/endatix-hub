"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { SubmissionAccessTokenPermission } from "@/lib/endatix-api/submissions/types";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

const DEFAULT_EXPIRY_MINUTES = 60 * 24 * 7;

export type SubmissionAccessLinkType =
  | "view"
  | "edit"
  | "share"
  | "export-pdf";

export interface SubmissionAccessLinkToken {
  type: SubmissionAccessLinkType;
  token: string;
  expiresAt: string;
}

export type CreateSubmissionAccessLinkResult =
  ResultType<SubmissionAccessLinkToken>;

const LINK_TYPE_PERMISSIONS = {
  view: ["view"],
  edit: ["view", "edit"],
  share: ["submit"],
  "export-pdf": ["export"],
} as const satisfies Record<
  SubmissionAccessLinkType,
  readonly SubmissionAccessTokenPermission[]
>;

export async function createSubmissionAccessLinkAction(
  formId: string,
  submissionId: string,
  type: SubmissionAccessLinkType,
  expiryMinutes = DEFAULT_EXPIRY_MINUTES,
): Promise<CreateSubmissionAccessLinkResult> {
  const permissions = LINK_TYPE_PERMISSIONS[type];
  if (!permissions) {
    return Result.error("Invalid share link type");
  }

  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const tokenResult = await api.submissions.createAccessToken({
    formId,
    submissionId,
    expiryMinutes,
    permissions: [...permissions],
  });

  const mappedTokenResult = toResult(tokenResult);
  if (Result.isError(mappedTokenResult)) {
    return mappedTokenResult;
  }

  return Result.success({
    type,
    token: mappedTokenResult.value.token,
    expiresAt: mappedTokenResult.value.expiresAt,
  });
}
