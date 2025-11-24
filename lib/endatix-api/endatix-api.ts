import { HeaderBuilder } from "@/lib/endatix-api/shared/header-builder";
import { ApiResult, ApiErrorDetails, ApiErrorType } from "./shared/api-result";
import { ERROR_CODE, getErrorMessageWithFallback } from "./shared/error-codes";
import { Forms } from "./forms/forms";
import { Submissions } from "./submissions/submissions";
import type { SessionData } from "@/features/auth";
import { parseErrorResponse } from "./shared/problem-details";
import Agents from "./agents/agents";
import Account from "./account/account";
import MyAccount from "./my-account/my-account";
import Auth from "./auth/auth";
import { Conversations } from "./conversations/conversations";
import Tenant from "./tenant/tenant";

/**
 * Gets the validated and cached API URL
 * This URL is validated at startup and cached for performance
 */
export const getEdatixApiUrl = (): string => {
  const apiUrl = process.env.ENDATIX_API_URL;
  if (!apiUrl) {
    throw new Error(
      "ENDATIX_API_URL not set. This should be configured via the withEndatix function. Please check your environment variables.",
    );
  }
  return apiUrl;
};

const DEFAULT_HEADERS = {};

export interface EndatixApiOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  requireAuth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
}

export class EndatixApi {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly session?: SessionData;
  private _forms?: Forms;
  private _submissions?: Submissions;
  private _agents?: Agents;
  private _auth?: Auth;
  private _account?: Account;
  private _myAccount?: MyAccount;
  private _conversations?: Conversations;
  private _tenant?: Tenant;

  constructor(
    sessionOrToken?: SessionData | string,
    options: EndatixApiOptions = {},
  ) {
    this.baseUrl = options.baseUrl || getEdatixApiUrl();
    this.defaultHeaders = options.defaultHeaders || DEFAULT_HEADERS;

    // Handle session data or JWT token
    if (typeof sessionOrToken === "string") {
      // JWT token provided - create minimal session
      this.session = {
        accessToken: sessionOrToken,
        refreshToken: "",
        username: "",
        isLoggedIn: true,
      };
    } else if (sessionOrToken) {
      // Full SessionData provided
      this.session = sessionOrToken;
    }
  }

  /**
   * Lazy-loaded auth API - only creates instance when first accessed
   */
  get auth(): Auth {
    if (!this._auth) {
      this._auth = new Auth(this);
    }
    return this._auth;
  }

  /**
   * Lazy-loaded forms API - only creates instance when first accessed
   */
  get forms(): Forms {
    if (!this._forms) {
      this._forms = new Forms(this);
    }
    return this._forms;
  }

  /**
   * Lazy-loaded submissions API - only creates instance when first accessed
   */
  get submissions(): Submissions {
    if (!this._submissions) {
      this._submissions = new Submissions(this);
    }
    return this._submissions;
  }

  /**
   * Lazy-loaded agents API - only creates instance when first accessed
   */
  get agents(): Agents {
    if (!this._agents) {
      this._agents = new Agents(this);
    }
    return this._agents;
  }

  /**
   * Lazy-loaded conversations API - only creates instance when first accessed
   */
  get conversations(): Conversations {
    if (!this._conversations) {
      this._conversations = new Conversations(this);
    }
    return this._conversations;
  }

  /**
   * Lazy-loaded account API - only creates instance when first accessed
   */
  get account(): Account {
    if (!this._account) {
      this._account = new Account(this);
    }
    return this._account;
  }

  /**
   * Lazy-loaded my account API - only creates instance when first accessed
   */
  get myAccount(): MyAccount {
    if (!this._myAccount) {
      this._myAccount = new MyAccount(this);
    }
    return this._myAccount;
  }

  /**
   * Lazy-loaded tenant API - only creates instance when first accessed
   */
  get tenant(): Tenant {
    if (!this._tenant) {
      this._tenant = new Tenant(this);
    }
    return this._tenant;
  }

  /**
   * Main request method that handles all API calls with Result pattern
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResult<T>> {
    const {
      method = "GET",
      requireAuth = true,
      body,
      headers: customHeaders = {},
    } = options;

    try {
      const headerBuilder = new HeaderBuilder();
      const baseHeaders = headerBuilder.build();

      const allHeaders = {
        ...baseHeaders,
        ...this.defaultHeaders,
        ...customHeaders,
      };
      if (this.session?.isLoggedIn) {
        headerBuilder.withAuth(this.session);
      } else if (requireAuth) {
        return ApiResult.authError(
          "Authentication required",
          ERROR_CODE.AUTHENTICATION_REQUIRED,
          {
            endpoint,
            method,
            statusCode: 401,
          },
        );
      }

      // Set content type for requests with body
      if (body && method !== "GET") {
        headerBuilder.provideJson();
      }

      // Always accept JSON responses
      headerBuilder.acceptJson();
      headerBuilder.build();

      const requestOptions: RequestInit = {
        method,
        headers: { ...headerBuilder.build(), ...allHeaders },
      };

      if (body) {
        requestOptions.body = JSON.stringify(body);
      }

      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, requestOptions);

      return await this.handleResponse<T>(response, endpoint, method);
    } catch (error) {
      return this.handleNetworkError<T>(error, endpoint, method);
    }
  }

  /**
   * Handle HTTP response and convert to ApiResult
   */
  private async handleResponse<T>(
    response: Response,
    endpoint: string,
    method: string,
  ): Promise<ApiResult<T>> {
    const details: ApiErrorDetails = {
      statusCode: response.status,
      endpoint,
      method,
    };

    if (!response.ok) {
      return await this.handleErrorResponse<T>(response, details);
    }

    try {
      // Handle empty responses (like DELETE operations)
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        return ApiResult.success(null as T);
      }

      const data = await response.json();
      return ApiResult.success(data);
    } catch (error) {
      return ApiResult.jsonParseError("Failed to parse response JSON", {
        ...details,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleErrorResponse<T>(
    response: Response,
    details: ApiErrorDetails,
  ): Promise<ApiResult<T>> {
    try {
      if (response.status === 401) {
        return ApiResult.authError(
          "Authentication required",
          ERROR_CODE.AUTHENTICATION_REQUIRED,
          details,
        );
      }

      const problemDetails = await parseErrorResponse(response);

      if (problemDetails?.errorCode) {
        details.details = problemDetails.detail;
      }

      const message = getErrorMessageWithFallback(
        problemDetails?.errorCode,
        problemDetails?.detail,
      );

      if (problemDetails?.errorCode) {
        const errorCode = problemDetails.errorCode;
        switch (response.status) {
          case 400:
            return {
              success: false,
              error: {
                type: ApiErrorType.ValidationError,
                message,
                errorCode,
                details,
                fields: problemDetails.fields,
              },
            };
          case 401:
            return {
              success: false,
              error: {
                type: ApiErrorType.AuthError,
                message,
                errorCode,
                details,
              },
            };
          case 403:
            return {
              success: false,
              error: {
                type: ApiErrorType.ForbiddenError,
                message,
                errorCode,
                details,
              },
            };
          case 404:
            return {
              success: false,
              error: {
                type: ApiErrorType.NotFoundError,
                message,
                errorCode,
                details,
              },
            };
          case 429:
            const retryAfter = response.headers.get("Retry-After");
            return {
              success: false,
              error: {
                type: ApiErrorType.RateLimitError,
                message,
                errorCode,
                details: {
                  ...details,
                  retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
                },
              },
            };
          case 500:
          case 502:
          case 503:
          case 504:
            return {
              success: false,
              error: {
                type: ApiErrorType.ServerError,
                message,
                errorCode,
                details,
              },
            };
          default:
            return {
              success: false,
              error: {
                type: ApiErrorType.UnknownError,
                message,
                errorCode,
                details,
              },
            };
        }
      }

      // Use factory methods when no specific errorCode from server
      switch (response.status) {
        case 400:
          return ApiResult.validationError(
            message,
            ERROR_CODE.VALIDATION_ERROR,
            details,
            problemDetails?.fields,
          );
        case 401:
          return ApiResult.authError(
            message,
            ERROR_CODE.AUTHENTICATION_REQUIRED,
            details,
          );
        case 403:
          return ApiResult.forbiddenError(
            message,
            ERROR_CODE.ACCESS_FORBIDDEN,
            details,
          );
        case 404:
          return ApiResult.notFoundError(message, details);
        case 429:
          const retryAfter = response.headers.get("Retry-After");
          return ApiResult.rateLimitError(message, {
            ...details,
            retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
          });
        case 500:
        case 502:
        case 503:
        case 504:
          return ApiResult.serverError(message, details);
        default:
          return ApiResult.unknownError(message, details);
      }
    } catch {
      // Fallback when we can't parse the error response
      return ApiResult.unknownError(
        `HTTP ${response.status}: ${response.statusText}`,
        details,
      );
    }
  }

  /**
   * Handle network-level errors (connection issues, timeouts, etc.)
   */
  private handleNetworkError<T>(
    error: unknown,
    endpoint: string,
    method: string,
  ): ApiResult<T> {
    const details: ApiErrorDetails = {
      endpoint,
      method,
      details: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return ApiResult.networkError(
        "Network error. Failed to connect to the Endatix API.",
        details,
      );
    }

    return ApiResult.unknownError(
      error instanceof Error ? error.message : "Unknown error occurred",
      details,
    );
  }

  // Convenience methods for common HTTP verbs
  async get<T>(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async delete<T>(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}
