import { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "../shared/api-result";
import type { EndatixApi } from "../endatix-api";
import { ExportSubmissionsRequest, Submission } from "./types";
import {
  validateEndatixId,
  validateHexToken,
} from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";

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
    const { formId, exportFormat, exportId } = request;

    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    const validatedFormId = validateFormIdResult.value;
    return this.endatix.postStream(
      `/forms/${validatedFormId}/submissions/export`,
      { exportFormat, exportId },
    );
  }
}
