import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import {
  PublicApiErrorType,
  PublicApiResult,
  type PublicApiResult as PublicApiResultType,
} from "../shared/api-result";
import { tryParseProblemDetails } from "../shared/problem-details";
import {
  DataListChoiceItem,
  DataListPublicSearchResult,
  PublicDataListDisplayValuesRequest,
  PublicDataListSearchRequest,
} from "./types";
import { EndatixPublicApiOptions } from "../endatix-public-api";

export class PublicDataListsClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  constructor(options: EndatixPublicApiOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.ENDATIX_API_URL ?? "";
    this.accessToken = options.accessToken;
  }

  async search(
    request: PublicDataListSearchRequest,
  ): Promise<PublicApiResultType<DataListPublicSearchResult>> {
    const validation = this.validateRequestIds(
      request.formId,
      request.dataListId,
    );
    if (validation) {
      return validation;
    }

    const bearerToken = this.resolveBearerToken(request.formAccessJwt);
    if (!bearerToken) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        "formAccessJwt is required (either per request or as client accessToken).",
      );
    }

    const query = new URLSearchParams();
    query.set("skip", String(request.skip ?? 0));
    query.set("take", String(request.take ?? 25));
    if (request.query) {
      query.set("query", request.query);
    }

    const endpoint = `/public/forms/${request.formId}/data-lists/${request.dataListId}/search?${query.toString()}`;
    return this.get<DataListPublicSearchResult>(endpoint, bearerToken);
  }

  async getDisplayValues(
    request: PublicDataListDisplayValuesRequest,
  ): Promise<PublicApiResultType<DataListChoiceItem[]>> {
    const validation = this.validateRequestIds(
      request.formId,
      request.dataListId,
    );
    if (validation) {
      return validation;
    }

    const bearerToken = this.resolveBearerToken(request.formAccessJwt);
    if (!bearerToken) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        "formAccessJwt is required (either per request or as client accessToken).",
      );
    }

    if (request.values.length === 0) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        "At least one value is required.",
      );
    }

    const query = new URLSearchParams();
    request.values.forEach((value) => query.append("values", value));

    const endpoint = `/public/forms/${request.formId}/data-lists/${request.dataListId}/display-values?${query.toString()}`;
    return this.get<DataListChoiceItem[]>(endpoint, bearerToken);
  }

  private resolveBearerToken(requestToken?: string): string | undefined {
    return requestToken ?? this.accessToken;
  }

  private validateRequestIds(
    formId: string,
    dataListId: string,
  ): PublicApiResultType<never> | null {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        validateFormIdResult.message,
      );
    }

    const validateDataListIdResult = validateEndatixId(
      dataListId,
      "dataListId",
    );
    if (Result.isError(validateDataListIdResult)) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        validateDataListIdResult.message,
      );
    }

    return null;
  }

  private async get<T>(
    endpoint: string,
    bearerToken: string,
  ): Promise<PublicApiResultType<T>> {
    if (!this.baseUrl) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        "ENDATIX_API_URL is not configured.",
      );
    }

    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    };

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        return this.mapError<T>(response, endpoint);
      }

      const data = (await response.json()) as T;
      return PublicApiResult.success(data);
    } catch (error) {
      return PublicApiResult.error(
        PublicApiErrorType.NetworkError,
        "Network error while calling public API.",
        {
          endpoint,
          method: "GET",
          details: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  private async mapError<T>(
    response: Response,
    endpoint: string,
  ): Promise<PublicApiResultType<T>> {
    const details = await tryParseProblemDetails(response);
    const message =
      details?.detail ??
      details?.title ??
      `Request failed with status ${response.status}`;

    const common = {
      statusCode: response.status,
      endpoint,
      method: "GET",
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
      return PublicApiResult.error(
        PublicApiErrorType.AuthError,
        message,
        common,
      );
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
}

export function createPublicDataListsClient(
  options?: EndatixPublicApiOptions,
): PublicDataListsClient {
  return new PublicDataListsClient(options);
}
