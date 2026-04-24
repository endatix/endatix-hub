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

interface PublicDataListsClientOptions {
  baseUrl?: string;
}

export class PublicDataListsClient {
  private readonly baseUrl: string;

  constructor(options: PublicDataListsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.ENDATIX_API_URL ?? "";
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

    const query = new URLSearchParams();
    query.set("skip", String(request.skip ?? 0));
    query.set("take", String(request.take ?? 25));
    if (request.query) {
      query.set("query", request.query);
    }
    if (request.token) {
      query.set("token", request.token);
    }
    if (request.tokenType) {
      query.set("tokenType", request.tokenType);
    }

    const endpoint = `/public/forms/${request.formId}/data-lists/${request.dataListId}/search?${query.toString()}`;
    return this.get<DataListPublicSearchResult>(endpoint);
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

    if (request.values.length === 0) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        "At least one value is required.",
      );
    }

    const query = new URLSearchParams();
    request.values.forEach((value) => query.append("values", value));
    if (request.token) {
      query.set("token", request.token);
    }
    if (request.tokenType) {
      query.set("tokenType", request.tokenType);
    }

    const endpoint = `/public/forms/${request.formId}/data-lists/${request.dataListId}/display-values?${query.toString()}`;
    return this.get<DataListChoiceItem[]>(endpoint);
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

  private async get<T>(endpoint: string): Promise<PublicApiResultType<T>> {
    if (!this.baseUrl) {
      return PublicApiResult.error(
        PublicApiErrorType.ValidationError,
        "ENDATIX_API_URL is not configured.",
      );
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
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
  options?: PublicDataListsClientOptions,
): PublicDataListsClient {
  return new PublicDataListsClient(options);
}
