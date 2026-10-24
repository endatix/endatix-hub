import {
  SurveyVariablePresets,
  type ISurveyVariablePresets,
} from "survey-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import type { AudienceUsage } from "../audience-usage";
import { lintFindings, undeclaredReferences } from "./findings/lint-findings";
import type { AudienceFinding } from "./findings/types";
import { toSurveyPresets } from "./to-survey-presets";

// The authoring door without the Creator: survey-core only, so the server can run it.

function variableNamesOf(presets: ISurveyVariablePresets) {
  const model = new SurveyVariablePresets(presets);
  try {
    return model.getVariableNames();
  } finally {
    model.dispose();
  }
}

function collisionsIn(findings: AudienceFinding[]): string[] {
  return findings.flatMap((finding) =>
    finding.kind === "variable-collision"
      ? [finding.variable.toLowerCase()]
      : [],
  );
}

/** What the form reads, given the linter's findings for it (they name the collisions). */
export function usageOf(
  surveyJson: object,
  presets: ISurveyVariablePresets,
  linted: AudienceFinding[],
): Omit<AudienceUsage, "coverage"> {
  const read = new Set([
    ...undeclaredReferences(surveyJson),
    ...collisionsIn(linted),
  ]);
  return { variableNames: variableNamesOf(presets), read: [...read] };
}

/** What the saved form reads of its variables; `null` when the form has no Properties. */
export function audienceUsage(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceUsage | null {
  if (!variables.variablePresets) return null;
  const presets = toSurveyPresets(variables.variablePresets);
  const linted = lintFindings(surveyJson, presets);
  const read = usageOf(surveyJson, presets, linted);
  return { ...read, coverage: variables.coverage };
}
