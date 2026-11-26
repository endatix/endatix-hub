import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { formAccessForbidden } from "../../http/form-access-result";
import type { FormStorageAccess } from "../../types";
import { mapPublicFormAccessToStorageAccess } from "../map-policy-to-storage-access";
import type { FormStorageGateRunContext } from "./gate-context";

function hasStoragePermission(access: FormStorageAccess) {
  return access.canViewFiles || access.canUploadFiles || access.canDeleteFiles;
}

/** Public form access policy for the current viewer, with a Hub session when present. */
export async function formPolicyStrategy(
  context: FormStorageGateRunContext,
): Promise<Result<FormStorageAccess>> {
  const { gate, hubAccessToken } = context;

  const { forms } = new EndatixApi(hubAccessToken);
  const policyResult = await forms.getPublicFormAccess(gate.formId, {}, Boolean(hubAccessToken));
  if (ApiResult.isError(policyResult)) {
    return formAccessForbidden("Form access denied");
  }

  const access = mapPublicFormAccessToStorageAccess(
    policyResult.data,
    gate.formId,
    gate.submissionId,
  );

  return hasStoragePermission(access) ? Result.success(access) : formAccessForbidden("Form access denied");
}
