import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { SubmissionView } from "./submission-view-types";

/** `forms/{formId}/reporting/submission-view`. */
export function buildSubmissionViewEndpoint(formId: string): string {
  return `/forms/${formId}/reporting/submission-view`;
}

/** The submissions grid view everyone on a form sees. */
export class SubmissionViews {
  constructor(private readonly endatix: EndatixApi) {}

  /** The saved view, or revision `"0"` and default settings. */
  async get(formId: string): Promise<ApiResult<SubmissionView>> {
    const validFormId = validateEndatixId(formId, "formId");
    if (Result.isError(validFormId)) {
      return ApiResult.validationError(validFormId.message);
    }

    return this.endatix.get<SubmissionView>(
      buildSubmissionViewEndpoint(validFormId.value),
    );
  }

  /** Saves `view.settings` over `view.revision`; a stale revision is 409. */
  async save(
    formId: string,
    view: SubmissionView,
  ): Promise<ApiResult<SubmissionView>> {
    const validFormId = validateEndatixId(formId, "formId");
    if (Result.isError(validFormId)) {
      return ApiResult.validationError(validFormId.message);
    }

    return this.endatix.put<SubmissionView>(
      buildSubmissionViewEndpoint(validFormId.value),
      { revision: view.revision, settings: view.settings },
    );
  }
}
