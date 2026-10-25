import "server-only";

import { TelemetryLogger } from "@/features/telemetry";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import type { AudienceUsage } from "@/lib/personalization/audience-usage";
import { audienceUsage } from "@/lib/personalization/authoring/usage";
import { Result, toResult } from "@/lib/result";
import { registerCoreSurveyModels } from "@/lib/survey-extensions/server";
import { parseSurveyJson } from "@/lib/survey-js";

export type AudienceUsageRequest = {
  api: EndatixApi;
  formId: string;
  /** The form's saved definition; a form never saved reads nothing. */
  activeDefinitionId?: string;
  /** From `loadAudienceVariables`, still loading: the saved form is read alongside it. */
  variables: Promise<AudienceVariables | null>;
};

async function loadSavedForm(
  api: EndatixApi,
  formId: string,
  activeDefinitionId: string,
): Promise<object | null> {
  const saved = toResult(
    await api.definitions.get(formId, activeDefinitionId),
    {
      fallbackMessage: "Failed to load the saved form for Audience coverage.",
      logMessage: "Failed to load the saved form for Audience coverage.",
      loggerName: "audience.coverage",
    },
  );
  return Result.isError(saved) ? null : parseSurveyJson(saved.value.jsonData);
}

/**
 * What a saved form reads of its variables, the verdict People and Preview as share; `null` without
 * Properties or when the lint fails. A custom piece's own properties (drag-categorize choice text) are
 * read only once it is registered.
 */
export function savedFormUsage(
  surveyJson: object,
  variables: AudienceVariables,
  formId: string,
): AudienceUsage | null {
  registerCoreSurveyModels();
  try {
    return audienceUsage(surveyJson, variables);
  } catch (error) {
    TelemetryLogger.error(
      "Failed to work out Audience coverage for the saved form.",
      error,
      { formId },
      "audience.coverage",
    );
    return null;
  }
}

/**
 * What the saved form reads of its variables, worked out here so the browser gets a few names and
 * counts rather than the form and SurveyJS. `null` leaves the coverage columns and marks out.
 */
export async function loadAudienceUsage({
  api,
  formId,
  activeDefinitionId,
  variables,
}: AudienceUsageRequest): Promise<AudienceUsage | null> {
  if (!activeDefinitionId) return null;
  const [loaded, surveyJson] = await Promise.all([
    variables,
    loadSavedForm(api, formId, activeDefinitionId),
  ]);
  if (!loaded?.variablePresets || !surveyJson) return null;
  return savedFormUsage(surveyJson, loaded, formId);
}
