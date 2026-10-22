import "server-only";

import { Permissions } from "@/features/auth/authorization";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { personalizationFlag } from "@/lib/feature-flags";
import { Result, toResult } from "@/lib/result";
import type { AudienceAccess } from "../shared/require-audience-api.server";

export type AudienceVariablesRequest = {
  api: EndatixApi;
  formId: string;
  /** From the page's own authorization pass. */
  checkPermission: AudienceAccess["checkPermission"];
};

/**
 * The designer's Preview as data. `null` (the designer as before) with the flag off, for a reader
 * who may not edit the form (the API's gate), or when the read fails: a designer must still open.
 */
export async function loadAudienceVariables({
  api,
  formId,
  checkPermission,
}: AudienceVariablesRequest): Promise<AudienceVariables | null> {
  if (!(await personalizationFlag())) return null;
  if (!(await checkPermission(Permissions.Forms.Edit)).success) return null;

  const result = toResult(await api.audience.getVariables(formId), {
    fallbackMessage: "Failed to load the form's Audience variables.",
    logMessage: "Failed to load Audience variables for the designer.",
    loggerName: "audience.variables.load",
  });
  return Result.isSuccess(result) ? result.value : null;
}
