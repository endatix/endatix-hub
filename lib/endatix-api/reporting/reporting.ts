import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type {
  BackfillSubmissionsRequest,
  BackfillSubmissionsResponse,
  CompileFormSchemaResponse,
} from "./types";

export class Reporting {
  constructor(private readonly endatix: EndatixApi) {}

  async compileSchema(formId: string): Promise<ApiResult<CompileFormSchemaResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.endatix.post<CompileFormSchemaResponse>(
      `/forms/${validateFormIdResult.value}/reporting/compile-schema`,
      {},
    );
  }

  async backfillSubmissions(
    formId: string,
    request: BackfillSubmissionsRequest = {},
  ): Promise<ApiResult<BackfillSubmissionsResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.endatix.post<BackfillSubmissionsResponse>(
      `/forms/${validateFormIdResult.value}/submissions/backfill`,
      {
        batchSize: request.batchSize,
        afterSubmissionId: request.afterSubmissionId,
        force: request.force,
      },
    );
  }
}
