import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import type { AudienceUsage } from "@/lib/personalization/audience-usage";
import { audienceUsage } from "@/lib/personalization/authoring/usage";
import { Result, toResult } from "@/lib/result";

export type AudienceUsageRequest = {
  api: EndatixApi;
  formId: string;
  /** The form's saved definition; a form never saved reads nothing. */
  activeDefinitionId?: string;
  /** From `loadAudienceVariables`: `null` for a reader who may not edit, or when it failed. */
  variables: AudienceVariables | null;
};

function parseDefinition(jsonData: string | undefined): object | null {
  try {
    return jsonData ? (JSON.parse(jsonData) as object) : null;
  } catch {
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
  if (!activeDefinitionId || !variables) return null;
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
  return surveyJson ? audienceUsage(surveyJson, variables) : null;
}
