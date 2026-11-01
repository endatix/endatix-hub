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

/** The flag is on and the reader may edit the form (the API's gate for both reads). */
async function mayRead({
  checkPermission,
}: AudienceVariablesRequest): Promise<boolean> {
  if (!(await personalizationFlag())) return false;
  return (await checkPermission(Permissions.Forms.Edit)).success;
}

async function readVariables({
  api,
  formId,
}: AudienceVariablesRequest): Promise<AudienceVariables | null> {
  const result = toResult(await api.audience.getVariables(formId), {
    fallbackMessage: "Failed to load the form's participant properties.",
    logMessage: "Failed to load participant properties for the designer.",
    loggerName: "audience.variables.load",
  });
  return Result.isSuccess(result) ? result.value : null;
}

async function readIdentifierKind({
  api,
}: AudienceVariablesRequest): Promise<AudienceIdentifierKind | null> {
  const settings = toResult(await api.audience.getSettings(), {
    fallbackMessage: "Failed to load the match key.",
    logMessage: "Failed to load the match key for the designer.",
    loggerName: "audience.variables.load",
  });
  return Result.isSuccess(settings) ? settings.value.identifierKind : null;
}

/**
 * The designer's Preview as data. `null` (the designer as before) with the flag off, for a reader
 * who may not edit the form (the API's gate), or when the read fails: a designer must still open.
 */
export async function loadAudienceVariables(
  request: AudienceVariablesRequest,
): Promise<AudienceVariables | null> {
  return (await mayRead(request)) ? readVariables(request) : null;
}

/** The designer's Audience: the variables and the tenant's match key, which the save needs. */
export type DesignerAudienceRead = {
  variables: AudienceVariables;
  /** `null` when the settings read fails: Preview as works, the values editor stays read-only. */
  identifierKind: AudienceIdentifierKind | null;
};

/** {@link loadAudienceVariables} and the match key, read together; `null` exactly when that is. */
export async function loadDesignerAudience(
  request: AudienceVariablesRequest,
): Promise<DesignerAudienceRead | null> {
  if (!(await mayRead(request))) return null;
  const [variables, identifierKind] = await Promise.all([
    readVariables(request),
    readIdentifierKind(request),
  ]);
  return variables && { variables, identifierKind };
}
