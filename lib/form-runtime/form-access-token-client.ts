"use client";

import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import {
  PublicApiErrorType,
  PublicApiResult,
  type PublicApiResult as PublicApiResultType,
} from "@/lib/endatix-public-api/shared/api-result";
import { tryParseProblemDetails } from "@/lib/endatix-public-api/shared/problem-details";

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
): Promise<PublicApiResultType<FormAccessTokenDto>> {
  const idCheck = validateEndatixId(formId, "formId");
  if (Result.isError(idCheck)) {
    return PublicApiResult.error(
      PublicApiErrorType.ValidationError,
      idCheck.message,
    );
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
      return mapCreateFormAccessTokenError(response, url);
    }

    const data = (await response.json()) as FormAccessTokenDto;
    return PublicApiResult.success(data);
  } catch (error) {
    return PublicApiResult.error(
      PublicApiErrorType.NetworkError,
      "Network error while creating form access token.",
      {
        endpoint: url,
        method: "POST",
        details: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

async function mapCreateFormAccessTokenError(
  response: Response,
  url: string,
): Promise<PublicApiResultType<FormAccessTokenDto>> {
  const details = await tryParseProblemDetails(response);
  const message =
    details?.detail ??
    details?.title ??
    `Request failed with status ${response.status}`;

  const common = {
    statusCode: response.status,
    endpoint: url,
    method: "POST" as const,
    details: details?.detail,
  };

  if (response.status === 400) {
    return PublicApiResult.error(
      PublicApiErrorType.ValidationError,
      message,
      common,
      details?.fields,
    );
  }

  if (response.status === 401) {
    return PublicApiResult.error(PublicApiErrorType.AuthError, message, common);
  }

  if (response.status === 403) {
    return PublicApiResult.error(
      PublicApiErrorType.ForbiddenError,
      message,
      common,
    );
  }

  if (response.status === 404) {
    return PublicApiResult.error(
      PublicApiErrorType.NotFoundError,
      message,
      common,
    );
  }

  if (response.status >= 500) {
    return PublicApiResult.error(
      PublicApiErrorType.ServerError,
      message,
      common,
    );
  }

  return PublicApiResult.error(
    PublicApiErrorType.UnknownError,
    message,
    common,
  );
}
