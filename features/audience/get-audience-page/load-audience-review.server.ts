import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result, toResult } from "@/lib/result";

/** What the Audience tab reviews: the saved form, and its variables with their coverage. */
export type AudienceReviewData = {
  surveyJson: object;
  variables: AudienceVariables;
};

export type AudienceReviewRequest = {
  api: EndatixApi;
  formId: string;
  /** The form's saved definition; a form never saved has nothing to review. */
  activeDefinitionId?: string;
};

const LOG = {
  fallbackMessage: "Failed to load the form's Audience coverage.",
  logMessage: "Failed to load the Audience coverage.",
  loggerName: "audience.coverage",
};

function parseDefinition(jsonData: string | undefined): object | null {
  try {
    return jsonData ? (JSON.parse(jsonData) as object) : null;
  } catch {
    return null;
  }
}

/**
 * The saved definition and the variables read, for "Used in form", "Filled in" and "not filled
 * in". `null` leaves those out: the tables still show without them.
 */
export async function loadAudienceReview({
  api,
  formId,
  activeDefinitionId,
}: AudienceReviewRequest): Promise<AudienceReviewData | null> {
  if (!activeDefinitionId) return null;
  const [definition, variables] = await Promise.all([
    api.definitions.get(formId, activeDefinitionId),
    api.audience.getVariables(formId),
  ]);
  const saved = toResult(definition, LOG);
  const read = toResult(variables, LOG);
  if (Result.isError(saved) || Result.isError(read)) return null;
  const surveyJson = parseDefinition(saved.value.jsonData);
  return surveyJson ? { surveyJson, variables: read.value } : null;
}
