"use client";

import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { ApiResult } from "../../shared/api-result";
import { mapResponseToApiError } from "../../shared/http-error-mapper";

export type CreateFormAccessTokenBody = {
  token?: string;
  tokenType?: "AccessToken" | "SubmissionToken";
};

export type FormAccessTokenDto = {
  token: string;
  expiresAtUtc: string;
};

/** Maps runtime legacy URL/session tokens to the create-token request body. */
export function buildFormAccessTokenBody(state: {
  token?: string;
  tokenType?: string;
}): CreateFormAccessTokenBody {
  if (!state.token) {
    return {};
  }
  if (
    state.tokenType === "AccessToken" ||
    state.tokenType === "SubmissionToken"
  ) {
    return { token: state.token, tokenType: state.tokenType };
  }
  return { token: state.token, tokenType: "AccessToken" };
}

/** Calls the Hub BFF route that mints a short-lived form access JWT. */
export async function createFormAccessToken(
  formId: string,
  body: CreateFormAccessTokenBody,
): Promise<ApiResult<FormAccessTokenDto>> {
  const idCheck = validateEndatixId(formId, "formId");
  if (Result.isError(idCheck)) {
    return ApiResult.validationError(idCheck.message);
  }

  const url = `/api/public/v0/forms/${formId}/access-tokens`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return mapResponseToApiError<FormAccessTokenDto>(response, {
        statusCode: response.status,
        endpoint: url,
        method: "POST",
      });
    }

    const data = (await response.json()) as FormAccessTokenDto;
    return ApiResult.success(data);
  } catch (error) {
    return ApiResult.networkError(
      "Network error while creating form access token.",
      {
        endpoint: url,
        method: "POST",
        details: error instanceof Error ? error.message : String(error),
      },
    );
  }
}
