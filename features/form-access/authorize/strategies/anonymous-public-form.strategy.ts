import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { formAccessForbidden } from "../../http/form-access-result";
import type { FormStorageAccess } from "../../types";
import type { FormStorageGateRunContext } from "./gate-context";

/** Anonymous form definition — public forms only (no Hub session). */
export async function anonymousPublicFormStrategy(
  context: FormStorageGateRunContext,
): Promise<Result<FormStorageAccess>> {
  const { gate, formAccessProvider } = context;
  const definitionResult = await formAccessProvider.getAnonymousFormDefinition(
    gate.formId,
  );

  if (ApiResult.isError(definitionResult)) {
    return formAccessForbidden("Form access denied");
  }

  return Result.success({
    formId: gate.formId,
    submissionId: gate.submissionId,
    isPublicForm: true,
    canViewFiles: true,
    canUploadFiles: true,
    canDeleteFiles: false,
  });
}
