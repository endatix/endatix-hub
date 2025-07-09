import { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "../shared/api-result";
import type { EndatixApi } from "../endatix-api";
import { Submission } from "./types";

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
    if (!formId) {
      return ApiResult.validationError("FormId is required");
    }

    if (!token) {
      return ApiResult.validationError("Token is required");
    }

    return this.endatix.patch<Submission>(
      `/forms/${formId}/submissions/by-token/${token}`,
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
    if (!formId) {
      return ApiResult.validationError("FormId is required");
    }

    if (!token) {
      return ApiResult.validationError("Token is required");
    }

    return this.endatix.get<Submission>(
      `/forms/${formId}/submissions/by-token/${token}`,
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
}
