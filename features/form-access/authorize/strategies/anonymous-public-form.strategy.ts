import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { formAccessForbidden } from "../../http/form-access-result";
import type { FormStorageAccess } from "../../types";
import type { FormStorageGateRunContext } from "./gate-context";

/** Anonymous form definition — public forms only (no Hub session). */
export async function anonymousPublicFormStrategy(
  { gate }: FormStorageGateRunContext,
): Promise<Result<FormStorageAccess>> {
  const definitionResult = await new EndatixApi().get<{ jsonData: string }>(
    `/forms/${gate.formId}/definition`,
    { requireAuth: false },
  );

  if (ApiResult.isError(definitionResult)) {
    return formAccessForbidden("Form access denied");
  }

  return Result.success({
    definitionJson: definitionResult.data.jsonData,
    formId: gate.formId,
    submissionId: gate.submissionId,
    isPublicForm: true,
    canViewFiles: true,
    canUploadFiles: true,
    canDeleteFiles: false,
  });
}
