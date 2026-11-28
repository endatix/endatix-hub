"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import {
  isAuthError,
  isNetworkError,
  isPreconditionFailed,
  type ApiError,
} from "@/lib/endatix-api/shared/api-result";
import { toResult } from "@/lib/result";
import type {
  DraftWrite,
  WriteResult,
} from "@/lib/survey-features/draft-autosave/controller";

function failure(error: ApiError): WriteResult {
  if (isPreconditionFailed(error) && error.error.details?.draft)
    return { kind: "stale", head: error.error.details.draft };
  toResult(error, {
    loggerName: "forms.draft",
    logMessage: "Draft save failed.",
    fallbackMessage: "Could not save draft.",
  });
  const kind = isAuthError(error)
    ? "auth"
    : isNetworkError(error)
      ? "offline"
      : "error";
  return { kind, message: error.error.message };
}

export async function saveDraftAction(
  formId: string,
  scope: string,
  request: DraftWrite,
): Promise<WriteResult> {
  const session = await auth();
  if (!session?.accessToken)
    return { kind: "auth", message: "Sign in to save your changes." };
  const { checkAllPermissions, getAuthorizationData } =
    await authorization(session);
  const access = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.Edit,
  ]);
  if (!access.success) return { kind: "error", message: access.error.message };
  const actor = await getAuthorizationData();
  if (
    !actor.success ||
    JSON.stringify([actor.data.tenantId, actor.data.userId, formId]) !== scope
  ) {
    return {
      kind: "auth",
      message: "Sign in to the account that opened this draft.",
    };
  }
  const drafts = new EndatixApi(session.accessToken).forms.drafts;
  if (!request.batch) {
    const result = await drafts.replace(
      formId,
      request.version,
      request.jsonData,
    );
    return result.success
      ? { kind: "saved", head: result.data }
      : failure(result);
  }
  const result = await drafts.append(formId, request.version, request.batch);
  if (!result.success) return failure(result);
  if (result.data.saveNo !== request.batch.saveNo)
    return {
      kind: "error",
      message: "The server did not acknowledge this save.",
    };
  const current = await drafts.get(formId);
  if (!current.success)
    return {
      kind: "error",
      message:
        "The server accepted the save, but the draft could not be read back.",
    };
  return current.data.version === result.data.version
    ? { kind: "saved", head: current.data }
    : { kind: "stale", head: current.data, acknowledged: true };
}
