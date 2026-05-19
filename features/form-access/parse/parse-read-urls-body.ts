import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { FormStorageGateInput, FormStorageTokenType } from "../types";
import { validateGateInput } from "./validate-gate-input";

export interface PublicReadUrlsRequestBody {
  formId?: string;
  submissionId?: string;
  token?: string;
  tokenType?: FormStorageTokenType;
  urls?: unknown;
}

export interface HubReadUrlsRequestBody {
  urls?: unknown;
  formId?: string;
  templateId?: string;
  submissionId?: string;
}

const MAX_READ_URLS = 50;

/**
 * Parses the urls field.
 * @param urls - The urls to parse.
 * @returns The parsed urls.
 */
function parseUrlsField(urls: unknown): Result<string[]> {
  if (urls === undefined) {
    return Result.validationError("urls is required");
  }

  if (!Array.isArray(urls) || !urls.every((url) => typeof url === "string")) {
    return Result.validationError("urls must be an array of strings");
  }

  const list = urls as string[];
  if (list.length === 0) {
    return Result.validationError("urls must not be empty");
  }

  if (list.length > MAX_READ_URLS) {
    return Result.validationError(
      `urls must not exceed ${MAX_READ_URLS} items`,
    );
  }

  return Result.success(list);
}

/**
 * Parses the hub read urls body.
 * @param body - The body to parse.
 * @returns The parsed body.
 */
export function parseHubReadUrlsBody(body: HubReadUrlsRequestBody): Result<{
  scope: { formId?: string; templateId?: string; submissionId?: string };
  urls: string[];
}> {
  const urlsResult = parseUrlsField(body.urls);
  if (Result.isError(urlsResult)) {
    return urlsResult;
  }

  const scope: {
    formId?: string;
    templateId?: string;
    submissionId?: string;
  } = {};

  if (body.formId?.trim()) {
    const formIdResult = validateEndatixId(body.formId.trim(), "formId");
    if (Result.isError(formIdResult)) {
      return formIdResult;
    }
    scope.formId = formIdResult.value;
  }

  if (body.templateId?.trim()) {
    const templateIdResult = validateEndatixId(
      body.templateId.trim(),
      "templateId",
    );
    if (Result.isError(templateIdResult)) {
      return templateIdResult;
    }
    scope.templateId = templateIdResult.value;
  }

  if (body.submissionId?.trim()) {
    const submissionIdResult = validateEndatixId(
      body.submissionId.trim(),
      "submissionId",
    );
    if (Result.isError(submissionIdResult)) {
      return submissionIdResult;
    }
    scope.submissionId = submissionIdResult.value;
  }

  return Result.success({
    scope,
    urls: urlsResult.value,
  });
}

/**
 * Parses the read urls body.
 * @param body - The body to parse.
 * @returns The parsed body.
 */
export function parsePublicReadUrlsBody(
  body: PublicReadUrlsRequestBody,
): Result<{ gate: FormStorageGateInput; urls: string[] }> {
  if (!body.formId?.trim()) {
    return Result.validationError("formId is required");
  }

  const urlsResult = parseUrlsField(body.urls);
  if (Result.isError(urlsResult)) {
    return urlsResult;
  }

  const gateResult = validateGateInput({
    formId: body.formId.trim(),
    submissionId: body.submissionId?.trim() || undefined,
    token: body.token?.trim() || undefined,
    tokenType: body.tokenType,
  });
  if (Result.isError(gateResult)) {
    return gateResult;
  }

  return Result.success({
    gate: gateResult.value,
    urls: urlsResult.value,
  });
}
