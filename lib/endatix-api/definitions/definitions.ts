import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { DefinitionField } from "./types";

export class Definitions {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Returns the union of single-value fields across all definitions for a form.
   */
  async getFields(formId: string): Promise<ApiResult<DefinitionField[]>> {
    const validateResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }

    return this.endatix.get<DefinitionField[]>(
      `/forms/${validateResult.value}/definition/fields`,
    );
  }
}
