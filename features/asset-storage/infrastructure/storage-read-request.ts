import {
  isFormStorageTokenType,
  type FormStorageTokenType,
} from "@/features/form-access";
import type { StorageReadRuntime } from "./storage-read-runtime";

/** Request body for public storage read-urls. */
export interface PublicStorageReadUrlsRequestBody {
  formId: string;
  submissionId?: string;
  token?: string;
  tokenType?: FormStorageTokenType;
  urls: string[];
}

/** Request body for hub storage read-urls. */
export interface HubStorageReadUrlsRequestBody {
  urls: string[];
  formId?: string;
  templateId?: string;
  submissionId?: string;
}

/** Builds the request body for public storage read-urls. */
export function buildPublicStorageReadUrlsBody(
  urls: string[],
  runtime: StorageReadRuntime,
): PublicStorageReadUrlsRequestBody {
  if (!runtime.formId) {
    throw new Error("formId is required for public storage read-urls");
  }

  return {
    formId: runtime.formId,
    urls,
    ...(runtime.submissionId ? { submissionId: runtime.submissionId } : {}),
    ...(runtime.token
      ? {
          token: runtime.token,
          ...(runtime.tokenType && isFormStorageTokenType(runtime.tokenType)
            ? { tokenType: runtime.tokenType }
            : {}),
        }
      : {}),
  };
}

/** Builds the request body for hub storage read-urls. */
export function buildHubStorageReadUrlsBody(
  urls: string[],
  runtime: StorageReadRuntime,
): HubStorageReadUrlsRequestBody {
  return {
    urls,
    ...(runtime.formId ? { formId: runtime.formId } : {}),
    ...(runtime.templateId ? { templateId: runtime.templateId } : {}),
    ...(runtime.submissionId ? { submissionId: runtime.submissionId } : {}),
  };
}

/** Request body for public storage gate. */
export interface PublicStorageGateRequestBody {
  formId: string;
  submissionId?: string;
  token?: string;
  tokenType?: FormStorageTokenType;
}

/** Gate fields for public storage mutations (upload/delete) aligned with read-urls. */
export function buildPublicStorageGateBody(
  base: { formId: string; submissionId?: string },
  runtime: StorageReadRuntime | null | undefined,
): PublicStorageGateRequestBody {
  const submissionId = base.submissionId ?? runtime?.submissionId;

  return {
    formId: base.formId,
    ...(submissionId ? { submissionId } : {}),
    ...(runtime?.token
      ? {
          token: runtime.token,
          ...(runtime.tokenType && isFormStorageTokenType(runtime.tokenType)
            ? { tokenType: runtime.tokenType }
            : {}),
        }
      : {}),
  };
}
