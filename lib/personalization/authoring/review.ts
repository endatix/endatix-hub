import { SurveyVariablePresets } from "survey-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { lintFindings } from "./findings/lint-findings";
import type { AudienceReview } from "./findings/types";
import { unusedProperties } from "./findings/unused-properties";
import { toSurveyPresets } from "./to-survey-presets";

function variableNamesOf(presets: ReturnType<typeof toSurveyPresets>) {
  const model = new SurveyVariablePresets(presets);
  try {
    return model.getVariableNames();
  } finally {
    model.dispose();
  }
}

/** The form's Audience findings: none when the form has no Properties (Q10). */
export function reviewAudience(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceReview {
  if (!variables.variablePresets) return { findings: [] };

  const presets = toSurveyPresets(variables.variablePresets);
  const names = variableNamesOf(presets);
  const linted = lintFindings(surveyJson, presets);
  const collisions = new Set(
    linted
      .filter((finding) => finding.kind === "variable-collision")
      .map((finding) => finding.variable.toLowerCase()),
  );
  return {
    findings: [...linted, ...unusedProperties(surveyJson, names, collisions)],
  };
}
