"use client";

import { withBasePath } from "@/lib/hosting";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { ApiResult } from "../../shared/api-result";
import { mapResponseToApiError } from "../../shared/http-error-mapper";
import type { FormAccessTokenResponse } from "@/lib/endatix-api/forms/types";
import { buildFormAccessTokenBody } from "./form-access-token.shared";

export type { CreateFormAccessTokenRequest as CreateFormAccessTokenBody } from "@/lib/endatix-api/forms/types";
export type { FormAccessTokenResponse as FormAccessTokenDto } from "@/lib/endatix-api/forms/types";

export { buildFormAccessTokenBody };

/** Calls the Hub BFF route that mints a short-lived form access JWT (browser only). */
export async function createFormAccessToken(
  formId: string,
  body: ReturnType<typeof buildFormAccessTokenBody>,
): Promise<ApiResult<FormAccessTokenResponse>> {
  const idCheck = validateEndatixId(formId, "formId");
  if (Result.isError(idCheck)) {
    return ApiResult.validationError(idCheck.message);
  }

  const url = withBasePath(`/api/public/v0/forms/${formId}/access-tokens`);

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
      return mapResponseToApiError(response, {
        statusCode: response.status,
        endpoint: url,
        method: "POST",
      });
    }

    const data = (await response.json()) as FormAccessTokenResponse;
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
