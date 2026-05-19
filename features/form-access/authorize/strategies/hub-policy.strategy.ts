import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { formAccessForbidden } from "../../http/form-access-result";
import type { FormStorageAccess } from "../../types";
import { mapPublicFormAccessToStorageAccess } from "../map-policy-to-storage-access";
import type { FormStorageGateRunContext } from "./gate-context";

/** Hub session + public form access policy for private forms. */
export async function hubPolicyStrategy(
  context: FormStorageGateRunContext,
): Promise<Result<FormStorageAccess>> {
  const { gate, hubAccessToken, formAccessProvider } = context;

  const policyResult = await formAccessProvider.getPublicFormAccess(
    gate.formId,
    hubAccessToken!,
  );
  
  if (ApiResult.isError(policyResult)) {
    return formAccessForbidden("Form access denied");
  }

  const access = mapPublicFormAccessToStorageAccess(
    policyResult.data,
    gate.formId,
    gate.submissionId,
  );

  if (
    !access.canViewFiles &&
    !access.canUploadFiles &&
    !access.canDeleteFiles
  ) {
    return formAccessForbidden("Form access denied");
  }

  return Result.success(access);
}
