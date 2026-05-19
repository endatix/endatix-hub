import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import {
  hasTokenPermission,
  isAccessToken,
  TokenPermission,
} from "@/lib/utils";
import { formAccessForbidden } from "../../http/form-access-result";
import type {
  FormStorageAccess,
  FormStorageGateInput,
  FormStorageTokenType,
} from "../../types";
import type { FormStorageGateRunContext } from "./gate-context";

function resolveTokenType(
  token: string,
  tokenType?: FormStorageTokenType,
): FormStorageTokenType {
  if (tokenType === "AccessToken" || tokenType === "SubmissionToken") {
    return tokenType;
  }
  return isAccessToken(token) ? "AccessToken" : "SubmissionToken";
}

function submissionIdMismatchMessage(tokenType: FormStorageTokenType): string {
  return tokenType === "AccessToken"
    ? "submissionId does not match access token"
    : "submissionId does not match submission token";
}

function assertGateSubmissionMatches(
  gate: FormStorageGateInput,
  submissionId: string,
  tokenType: FormStorageTokenType,
): Result<FormStorageAccess> | null {
  if (gate.submissionId && gate.submissionId !== submissionId) {
    return formAccessForbidden(submissionIdMismatchMessage(tokenType));
  }

  return null;
}

/** Submission or access token (body or cookie). */
export async function tokenGateStrategy(
  context: FormStorageGateRunContext,
): Promise<Result<FormStorageAccess>> {
  const { gate, formAccessProvider } = context;
  const token = gate.token!;
  const tokenType = resolveTokenType(token, gate.tokenType);

  if (tokenType === "AccessToken") {
    const submissionResult =
      await formAccessProvider.getSubmissionByAccessToken(gate.formId, token);
    if (ApiResult.isError(submissionResult)) {
      return formAccessForbidden("Form access denied");
    }

    const submissionId = submissionResult.data.id;
    const mismatch = assertGateSubmissionMatches(
      gate,
      submissionId,
      tokenType,
    );
    if (mismatch !== null) {
      return mismatch;
    }

    const canEdit = hasTokenPermission(token, TokenPermission.Write);
    return Result.success({
      formId: gate.formId,
      submissionId,
      isPublicForm: false,
      canViewFiles: true,
      canUploadFiles: canEdit,
      canDeleteFiles: canEdit,
    });
  }

  const submissionResult = await formAccessProvider.getSubmissionByToken(
    gate.formId,
    token,
  );
  if (ApiResult.isError(submissionResult)) {
    return formAccessForbidden("Form access denied");
  }

  const submissionId = submissionResult.data.id;
  const mismatch = assertGateSubmissionMatches(gate, submissionId, tokenType);
  if (mismatch !== null) {
    return mismatch;
  }

  return Result.success({
    formId: gate.formId,
    submissionId,
    isPublicForm: false,
    canViewFiles: true,
    canUploadFiles: true,
    canDeleteFiles: true,
  });
}
