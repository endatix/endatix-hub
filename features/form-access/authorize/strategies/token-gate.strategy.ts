import { ApiResult, EndatixApi } from "@/lib/endatix-api";
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
  const { gate } = context;
  const token = gate.token!;
  const tokenType = resolveTokenType(token, gate.tokenType);
  const api = new EndatixApi();

  if (tokenType === "AccessToken") {
    const submissionResult = await api.submissions.public.getByAccessToken(
      gate.formId,
      token,
    );
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

    const isIncompleteSubmission = submissionResult.data.isComplete === false;
    const canEdit = hasTokenPermission(token, TokenPermission.Write);
    const canSubmitIncomplete =
      hasTokenPermission(token, TokenPermission.Submit) && isIncompleteSubmission;
    const canMutateFiles = canEdit || canSubmitIncomplete;

    return Result.success({
      formId: gate.formId,
      submissionId,
      isPublicForm: false,
      canViewFiles: true,
      canUploadFiles: canMutateFiles,
      canDeleteFiles: canMutateFiles,
    });
  }

  const submissionResult = await api.submissions.public.getByToken(
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
