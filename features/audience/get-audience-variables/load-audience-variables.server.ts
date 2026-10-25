import "server-only";

import { Permissions } from "@/features/auth/authorization";
import type { EndatixApi } from "@/lib/endatix-api";
import type {
  AudienceIdentifierKind,
  AudienceVariables,
} from "@/lib/endatix-api/audience/types";
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

/** The designer's Audience: the variables and the tenant's match key, which the save needs. */
export type DesignerAudienceRead = {
  variables: AudienceVariables;
  /** `null` when the settings read fails: Preview as works, the values editor stays read-only. */
  identifierKind: AudienceIdentifierKind | null;
};

/** {@link loadAudienceVariables}, then the match key; `null` exactly when that returns `null`. */
export async function loadDesignerAudience(
  request: AudienceVariablesRequest,
): Promise<DesignerAudienceRead | null> {
  const variables = await loadAudienceVariables(request);
  if (!variables) return null;

  const settings = toResult(await request.api.audience.getSettings(), {
    fallbackMessage: "Failed to load the Audience settings.",
    logMessage: "Failed to load the Audience match key for the designer.",
    loggerName: "audience.variables.load",
  });
  const identifierKind = Result.isSuccess(settings)
    ? settings.value.identifierKind
    : null;
  return { variables, identifierKind };
}
