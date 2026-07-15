import { SubmissionData } from "@/features/submissions/types";
import { Result } from "@/lib/result";
import {
  validateEndatixId,
  validateHexToken,
} from "@/lib/utils/type-validators";
import type { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import {
  appendPagingQueryParams,
  buildEndpointWithQuery,
} from "../shared/query-params";
import { appendSubmissionListFilters } from "./submission-list-query-params";
import {
  CreateSubmissionAccessTokenRequest,
  CreateSubmissionAccessTokenResponse,
  ExportSubmissionsRequest,
  ListSubmissionsRequest,
  ListSubmissionsResponse,
  Submission,
} from "./types";
import {
  SUBMISSION_LIST_DEFAULT_PAGE,
  SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
} from "@/features/submissions/list-submission-query";

class PublicSubmissions {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Create a new submission (public API - no authentication required)
   */
  async create(
    formId: string,
    submissionData: SubmissionData,
  ): Promise<ApiResult<Submission>> {
    if (!formId) {
      return ApiResult.validationError("FormId is required");
    }

    return this.endatix.post<Submission>(
      `/forms/${formId}/submissions`,
      submissionData,
      { requireAuth: false },
    );
  }

  /**
   * Update an existing submission using token (public API - no authentication required)
   */
  async updateByToken(
    formId: string,
    token: string,
    submissionData: SubmissionData,
  ): Promise<ApiResult<Submission>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const validateTokenResult = validateHexToken(token, "token");
    if (Result.isError(validateTokenResult)) {
      return ApiResult.validationError(validateTokenResult.message);
    }

    return this.endatix.patch<Submission>(
      `/forms/${validateFormIdResult.value}/submissions/by-token/${validateTokenResult.value}`,
      submissionData,
      { requireAuth: false },
    );
  }

  /**
   * Get a submission by token (public API - no authentication required)
   */
  async getByToken(
    formId: string,
    token: string,
  ): Promise<ApiResult<Submission>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const validateTokenResult = validateHexToken(token, "token");
    if (Result.isError(validateTokenResult)) {
      return ApiResult.validationError(validateTokenResult.message);
    }

    return this.endatix.get<Submission>(
      `/forms/${validateFormIdResult.value}/submissions/by-token/${validateTokenResult.value}`,
      { requireAuth: false },
    );
  }

  /**
   * Get a submission by access token (public API - no authentication required).
   * Requires 'view' permission in the token.
   */
  async getByAccessToken(
    formId: string,
    token: string,
  ): Promise<ApiResult<Submission>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    if (!token) {
      return ApiResult.validationError("Access token is required");
    }

    return this.endatix.get<Submission>(
      `/forms/${validateFormIdResult.value}/submissions/by-access-token/${token}`,
      { requireAuth: false },
    );
  }

  /**
   * Update a submission by access token (public API - no authentication required).
   * Requires 'edit' permission in the token.
   */
  async updateByAccessToken(
    formId: string,
    token: string,
    submissionData: SubmissionData,
  ): Promise<ApiResult<Submission>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    if (!token) {
      return ApiResult.validationError("Access token is required");
    }

    return this.endatix.patch<Submission>(
      `/forms/${validateFormIdResult.value}/submissions/by-access-token/${token}`,
      submissionData,
      { requireAuth: false },
    );
  }
}

export class Submissions {
  private _public?: PublicSubmissions;

  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Public API methods (no authentication required)
   */
  get public(): PublicSubmissions {
    if (!this._public) {
      this._public = new PublicSubmissions(this.endatix);
    }
    return this._public;
  }

  /**
   * Exports form submissions in the specified format (CSV, JSON, etc.)
   * Returns a streaming response for direct download with all headers preserved
   */
  async export(
    request: ExportSubmissionsRequest,
  ): Promise<ApiResult<Response>> {
    const {
      formId,
      exportFormat,
      exportId,
      includeTestSubmissions,
      columnScope,
    } = request;

    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const validatedFormId = validateFormIdResult.value;
    return this.endatix.postStream(
      `/forms/${validatedFormId}/submissions/export`,
      {
        exportFormat,
        exportId,
        includeTestSubmissions,
        columnScope,
      },
    );
  }

  /**
   * List all submissions for a form with optional filters
   */
  async list(
    formId: string,
    request: ListSubmissionsRequest = {},
  ): Promise<ApiResult<ListSubmissionsResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const params = new URLSearchParams();
    appendPagingQueryParams(params, request, {
      page: SUBMISSION_LIST_DEFAULT_PAGE,
      pageSize: SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
    });
    appendSubmissionListFilters(params, request);

    const endpoint = buildEndpointWithQuery(
      `/forms/${validateFormIdResult.value}/submissions`,
      params,
    );

    return this.endatix.get<ListSubmissionsResponse>(endpoint);
  }

  async createAccessToken(
    request: CreateSubmissionAccessTokenRequest,
  ): Promise<ApiResult<CreateSubmissionAccessTokenResponse>> {
    const validateFormIdResult = validateEndatixId(request.formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const validateSubmissionIdResult = validateEndatixId(
      request.submissionId,
      "submissionId",
    );
    if (Result.isError(validateSubmissionIdResult)) {
      return ApiResult.validationError(validateSubmissionIdResult.message);
    }

    return this.endatix.post<CreateSubmissionAccessTokenResponse>(
      `/forms/${validateFormIdResult.value}/submissions/${validateSubmissionIdResult.value}/access-token`,
      {
        expiryMinutes: request.expiryMinutes,
        permissions: request.permissions,
      },
    );
  }
}
