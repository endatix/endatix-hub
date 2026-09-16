"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { SubmissionAccessTokenPermission } from "@/lib/endatix-api/submissions/types";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import {
  clampExpiryMinutes,
  DEFAULT_EXPIRY_MINUTES,
} from "./share-link-expiry";

export type SubmissionAccessLinkType = "view" | "edit" | "share" | "export-pdf";

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
    // Corrected here rather than sent on: the API validates the range and would
    // answer with an opaque 400 long after the user picked a lifetime.
    expiryMinutes: clampExpiryMinutes(expiryMinutes),
    permissions: [...permissions],
  });

  const mappedTokenResult = toResult(tokenResult, {
    fallbackMessage: "Failed to create submission share link.",
    logMessage: "Failed to create submission share link.",
    loggerName: "submissions.createAccessLink",
  });
  if (Result.isError(mappedTokenResult)) {
    return mappedTokenResult;
  }

  return Result.success({
    type,
    token: mappedTokenResult.value.token,
    expiresAt: mappedTokenResult.value.expiresAt,
  });
}
