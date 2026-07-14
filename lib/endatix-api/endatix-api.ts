import { HeaderBuilder } from "@/lib/endatix-api/shared/header-builder";
import { ApiResult, ApiErrorDetails } from "./shared/api-result";
import { ERROR_CODE } from "./shared/error-codes";
import { mapResponseToApiError } from "./shared/http-error-mapper";
import { Definitions } from "./definitions/definitions";
import { DataLists } from "./data-lists/data-lists";
import { Forms } from "./forms/forms";
import { Submissions } from "./submissions/submissions";
import type { SessionData } from "@/features/auth";
import Agents from "./agents/agents";
import Account from "./account/account";
import MyAccount from "./my-account/my-account";
import Auth from "./auth/auth";
import { Conversations } from "./conversations/conversations";
import Tenant from "./tenant/tenant";
import Users from "./users/users";
import Roles from "./roles/roles";
import Stats from "./stats/stats";
import { Folders } from "./folders/folders";
import { FormTemplates } from "./form-templates/form-templates";
import Email from "./email/email";
import AuthAdmin from "./auth-admin/auth-admin";
import PlatformTenants from "./platform-tenants/platform-tenants";
import PlatformAdmins from "./platform-admins/platform-admins";
import { Reporting } from "./reporting/reporting";

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

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type RequestHeaders = Record<string, string>;

export interface EndatixApiOptions {
  baseUrl?: string;
  defaultHeaders?: RequestHeaders;
}

export interface RequestOptions {
  method?: RequestMethod;
  requireAuth?: boolean;
  body?: unknown;
  headers?: RequestHeaders;
}

export class EndatixApi {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly session?: SessionData;
  private _definitions?: Definitions;
  private _dataLists?: DataLists;
  private _forms?: Forms;
  private _submissions?: Submissions;
  private _reporting?: Reporting;
  private _agents?: Agents;
  private _auth?: Auth;
  private _account?: Account;
  private _myAccount?: MyAccount;
  private _conversations?: Conversations;
  private _tenant?: Tenant;
  private _users?: Users;
  private _roles?: Roles;
  private _stats?: Stats;
  private _folders?: Folders;
  private _formTemplates?: FormTemplates;
  private _email?: Email;
  private _authAdmin?: AuthAdmin;
  private _platformTenants?: PlatformTenants;
  private _platformAdmins?: PlatformAdmins;

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
   * Lazy-loaded definitions API - only creates instance when first accessed
   */
  get definitions(): Definitions {
    if (!this._definitions) {
      this._definitions = new Definitions(this);
    }
    return this._definitions;
  }

  /**
   * Lazy-loaded data lists API - only creates instance when first accessed
   */
  get dataLists(): DataLists {
    return this._dataLists ?? new DataLists(this);
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

  get reporting(): Reporting {
    if (!this._reporting) {
      this._reporting = new Reporting(this);
    }
    return this._reporting;
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
   * Lazy-loaded users API - only creates instance when first accessed
   */
  get users(): Users {
    if (!this._users) {
      this._users = new Users(this);
    }
    return this._users;
  }

  get roles(): Roles {
    this._roles ??= new Roles(this);
    return this._roles;
  }

  /**
   * Lazy-loaded stats API - only creates instance when first accessed
   */
  get stats(): Stats {
    this._stats ??= new Stats(this);
    return this._stats;
  }

  get folders(): Folders {
    this._folders ??= new Folders(this);
    return this._folders;
  }

  get formTemplates(): FormTemplates {
    this._formTemplates ??= new FormTemplates(this);
    return this._formTemplates;
  }

  get email(): Email {
    this._email ??= new Email(this);
    return this._email;
  }

  get authAdmin(): AuthAdmin {
    this._authAdmin ??= new AuthAdmin(this);
    return this._authAdmin;
  }

  get platformTenants(): PlatformTenants {
    this._platformTenants ??= new PlatformTenants(this);
    return this._platformTenants;
  }

  get platformAdmins(): PlatformAdmins {
    this._platformAdmins ??= new PlatformAdmins(this);
    return this._platformAdmins;
  }

  /**
   * Main request method that handles all API calls with Result pattern
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResult<T>> {
    const method = options.method || "GET";

    try {
      const requestInitResult = this.initializeRequest(
        endpoint,
        options,
        (headerBuilder) => {
          headerBuilder.acceptJson();
        },
      );

      if (ApiResult.isError(requestInitResult)) {
        return requestInitResult;
      }

      const requestInit = requestInitResult.data;
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, requestInit);

      return await this.handleResponse<T>(response, endpoint, method);
    } catch (error) {
      return this.handleNetworkError<T>(error, endpoint, method);
    }
  }

  /**
   * Request method for streaming responses (file downloads, etc.)
   * Returns the raw Response object with all headers preserved.
   * Does NOT parse JSON - use this for binary/streaming responses.
   */
  async requestStream(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResult<Response>> {
    const method = options.method || "GET";

    try {
      const requestInitResult = this.initializeRequest(endpoint, options);

      if (ApiResult.isError(requestInitResult)) {
        return requestInitResult;
      }

      const requestInit = requestInitResult.data;
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, requestInit);

      if (!response.ok) {
        return await this.handleErrorResponse<Response>(response, {
          statusCode: response.status,
          endpoint,
          method,
        });
      }

      return ApiResult.success(response);
    } catch (error) {
      return this.handleNetworkError<Response>(error, endpoint, method);
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

  /**
   * Common method to build the request options including headers, auth, and body.
   * @param endpoint - The endpoint to request.
   * @param requestOptions - The request options.
   * @param headerActions - Optional actions to perform on the header builder.
   * @returns The request initialization object for use with fetch api.
   */
  private initializeRequest(
    endpoint: string,
    requestOptions: RequestOptions,
    headerActions?: (headerBuilder: HeaderBuilder) => void,
  ): ApiResult<RequestInit> {
    const {
      method = "GET",
      requireAuth = true,
      body,
      headers: customHeaders = {},
    } = requestOptions;

    if (requireAuth && !this.session?.isLoggedIn) {
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

    const headerBuilder = new HeaderBuilder();
    const baseHeaders = headerBuilder.build();

    const allHeaders = {
      ...baseHeaders,
      ...this.defaultHeaders,
      ...customHeaders,
    };

    if (this.session?.isLoggedIn) {
      headerBuilder.withAuth(this.session);
    }

    if (body && method !== "GET") {
      headerBuilder.provideJson();
    }

    if (headerActions) {
      headerActions(headerBuilder);
    }

    const requestInit: RequestInit = {
      method,
      headers: { ...headerBuilder.build(), ...allHeaders },
      body: body ? JSON.stringify(body) : undefined,
    };

    return ApiResult.success(requestInit);
  }

  /**
   * Handles the error response and converts it to an ApiResult.
   * Delegates to the shared mapper so browser and Node clients behave consistently.
   */
  private async handleErrorResponse<T>(
    response: Response,
    details: ApiErrorDetails,
  ): Promise<ApiResult<T>> {
    try {
      return await mapResponseToApiError<T>(response, details);
    } catch {
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

  async postStream(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<ApiResult<Response>> {
    return this.requestStream(endpoint, {
      ...options,
      method: "POST",
      body,
    });
  }

  async getStream(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<ApiResult<Response>> {
    return this.requestStream(endpoint, { ...options, method: "GET" });
  }
}
