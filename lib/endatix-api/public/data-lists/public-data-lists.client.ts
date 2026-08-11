import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { ApiResult } from "../../shared/api-result";
import { mapResponseToApiError } from "../../shared/http-error-mapper";
import {
  DataListChoiceItem,
  DataListPublicSearchResult,
  PublicDataListDisplayValuesRequest,
  PublicDataListSearchRequest,
} from "./types";

const INCLUDE_LOCALES_QUERY_PARAM = "includeLocales";

export interface PublicDataListsClientOptions {
  baseUrl?: string;
  /** Optional default bearer token used for all requests unless overridden per call. */
  accessToken?: string;
}

export class PublicDataListsClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  constructor(options: PublicDataListsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.ENDATIX_API_URL ?? "";
    this.accessToken = options.accessToken;
  }

  async search(
    request: PublicDataListSearchRequest,
  ): Promise<ApiResult<DataListPublicSearchResult>> {
    const validation = this.validateRequestIds(
      request.formId,
      request.dataListId,
    );
    if (validation) {
      return validation;
    }

    const bearerToken = this.resolveBearerToken(request.formAccessJwt);
    if (!bearerToken) {
      return ApiResult.validationError(
        "formAccessJwt is required (either per request or as client accessToken).",
      );
    }

    const query = new URLSearchParams();
    query.set("skip", String(request.skip ?? 0));
    query.set("take", String(request.take ?? 25));
    if (request.query) {
      query.set("query", request.query);
    }
    if (request.matchMode) {
      query.set("matchMode", request.matchMode);
    }
    if (request.locale) {
      query.set("locale", request.locale);
    }
    for (const locale of request.includeLocales ?? []) {
      const trimmed = locale.trim();
      if (trimmed.length > 0) {
        query.append(INCLUDE_LOCALES_QUERY_PARAM, trimmed);
      }
    }

    const endpoint = `/public/forms/${request.formId}/data-lists/${request.dataListId}/search?${query.toString()}`;
    return this.get<DataListPublicSearchResult>(endpoint, bearerToken);
  }

  async getDisplayValues(
    request: PublicDataListDisplayValuesRequest,
  ): Promise<ApiResult<DataListChoiceItem[]>> {
    const validation = this.validateRequestIds(
      request.formId,
      request.dataListId,
    );
    if (validation) {
      return validation;
    }

    const bearerToken = this.resolveBearerToken(request.formAccessJwt);
    if (!bearerToken) {
      return ApiResult.validationError(
        "formAccessJwt is required (either per request or as client accessToken).",
      );
    }

    if (request.values.length === 0) {
      return ApiResult.validationError("At least one value is required.");
    }

    const query = new URLSearchParams();
    request.values.forEach((value) => query.append("values", value));
    if (request.locale) {
      query.set("locale", request.locale);
    }
    for (const locale of request.includeLocales ?? []) {
      const trimmed = locale.trim();
      if (trimmed.length > 0) {
        query.append(INCLUDE_LOCALES_QUERY_PARAM, trimmed);
      }
    }

    const endpoint = `/public/forms/${request.formId}/data-lists/${request.dataListId}/display-values?${query.toString()}`;
    return this.get<DataListChoiceItem[]>(endpoint, bearerToken);
  }

  private resolveBearerToken(requestToken?: string): string | undefined {
    return requestToken ?? this.accessToken;
  }

  private validateRequestIds(
    formId: string,
    dataListId: string,
  ): ApiResult<never> | null {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const validateDataListIdResult = validateEndatixId(
      dataListId,
      "dataListId",
    );
    if (Result.isError(validateDataListIdResult)) {
      return ApiResult.validationError(validateDataListIdResult.message);
    }

    return null;
  }

  private async get<T>(
    endpoint: string,
    bearerToken: string,
  ): Promise<ApiResult<T>> {
    if (!this.baseUrl) {
      return ApiResult.validationError("ENDATIX_API_URL is not configured.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    };

    try {
      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        return mapResponseToApiError<T>(response, {
          statusCode: response.status,
          endpoint,
          method: "GET",
        });
      }

      const data = (await response.json()) as T;
      return ApiResult.success(data);
    } catch (error) {
      return ApiResult.networkError("Network error while calling public API.", {
        endpoint,
        method: "GET",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function createPublicDataListsClient(
  options?: PublicDataListsClientOptions,
): PublicDataListsClient {
  return new PublicDataListsClient(options);
}
