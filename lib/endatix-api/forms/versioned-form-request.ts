import { Result } from "@/lib/result";
import { isFormVersion, validateEndatixId } from "@/lib/utils/type-validators";
import { ApiResult } from "../shared/api-result";

export function ifMatch(version: string) {
  return { headers: { "If-Match": `"${version}"` } };
}

export function versionedFormRequest(formId: string, version: string) {
  const id = validateEndatixId(formId, "formId");
  if (Result.isError(id)) return ApiResult.validationError<never>(id.message);
  if (!isFormVersion(version)) {
    return ApiResult.validationError<never>("Invalid draft version.");
  }
  return ApiResult.success({
    path: `/forms/${id.value}`,
    options: ifMatch(version),
  });
}
