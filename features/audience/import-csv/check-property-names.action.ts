"use server";

import { Permissions } from "@/features/auth/authorization";
import type { EndatixApi } from "@/lib/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { registerCoreSurveyModels } from "@/lib/survey-extensions/server";
import {
  variableCollisions,
  type VariableCollision,
} from "@/lib/survey-features/survey-lint";
import { parseSurveyJson } from "@/lib/survey-js";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const CHECK_LOG = {
  permission: Permissions.Forms.Edit,
  // A check while the panel is open: a missing grant is a warning that cannot be shown, not a redirect.
  background: true,
  fallbackMessage: "Failed to check the new property names against the form.",
  logMessage: "Failed to check new property names against the saved form.",
  loggerName: "audience.import.names",
} as const;

/** The saved form's JSON; `null` for a form never saved, which writes no data yet. */
async function savedForm(
  api: EndatixApi,
  formId: string,
): Promise<ApiResult<object | null>> {
  const form = await api.forms.get(formId);
  if (!ApiResult.isSuccess(form)) return form;
  const definitionId = form.data.activeDefinitionId;
  if (!definitionId) return ApiResult.success(null);
  const definition = await api.definitions.get(formId, definitionId);
  if (!ApiResult.isSuccess(definition)) return definition;
  return ApiResult.success(parseSurveyJson(definition.data.jsonData));
}

/**
 * Which of the variable names a new property would get the saved form already writes as data
 * (a root question or a calculated value), so the New properties step can warn before creating.
 * Run here so the browser never loads the linter.
 */
export async function checkPropertyNamesAction(
  formId: string,
  names: string[],
): Promise<Result<VariableCollision[]>> {
  return withHubAudienceApi(async (api) => {
    const json = await savedForm(api, formId);
    if (!ApiResult.isSuccess(json)) return json;
    if (!json.data || names.length === 0) return ApiResult.success([]);
    registerCoreSurveyModels();
    return ApiResult.success(variableCollisions(json.data, names));
  }, CHECK_LOG);
}
