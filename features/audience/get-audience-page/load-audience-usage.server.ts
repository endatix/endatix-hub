import "server-only";

import { TelemetryLogger } from "@/features/telemetry";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import type { AudienceUsage } from "@/lib/personalization/audience-usage";
import { audienceUsage } from "@/lib/personalization/authoring/usage";
import { Result, toResult } from "@/lib/result";
import { registerCoreSurveyModels } from "@/lib/survey-extensions/server";

export type AudienceUsageRequest = {
  api: EndatixApi;
  formId: string;
  /** The form's saved definition; a form never saved reads nothing. */
  activeDefinitionId?: string;
  /** From `loadAudienceVariables`: `null` for a reader who may not edit, or when it failed. */
  variables: AudienceVariables | null;
};

function isSurveyObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDefinition(jsonData: string | undefined): object | null {
  if (!jsonData) return null;
  try {
    const parsed: unknown = JSON.parse(jsonData);
    return isSurveyObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** A custom piece's own properties (drag-categorize choice text) are read only once it is registered. */
function coverageOf(
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
  if (!activeDefinitionId || !variables?.variablePresets) return null;
  const saved = toResult(
    await api.definitions.get(formId, activeDefinitionId),
    {
      fallbackMessage: "Failed to load the saved form for Audience coverage.",
      logMessage: "Failed to load the saved form for Audience coverage.",
      loggerName: "audience.coverage",
    },
  );
  if (Result.isError(saved)) return null;
  const surveyJson = parseDefinition(saved.value.jsonData);
  return surveyJson ? coverageOf(surveyJson, variables, formId) : null;
}
