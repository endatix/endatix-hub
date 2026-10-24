import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { usageVerdicts, type AudienceUsage } from "../audience-usage";
import { notFilledInFindings } from "./findings/coverage";
import { lintFindings } from "./findings/lint-findings";
import type { AudienceReview } from "./findings/types";
import { unusedProperties } from "./findings/unused-properties";
import { toSurveyPresets } from "./to-survey-presets";
import { usageOf } from "./usage";

const NO_USAGE = (variables: AudienceVariables): AudienceUsage => ({
  variableNames: [],
  read: [],
  coverage: variables.coverage,
});

/**
 * The form's Audience verdicts, the same for the designer and the Audience tab: findings, and per
 * Property and participant what the form reads and who filled it in. Empty without Properties (Q10).
 */
export function reviewAudience(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceReview {
  if (!variables.variablePresets) {
    return { findings: [], ...usageVerdicts(NO_USAGE(variables)) };
  }
  const presets = toSurveyPresets(variables.variablePresets);
  const linted = lintFindings(surveyJson, presets);
  const usage = {
    ...usageOf(surveyJson, presets, linted),
    coverage: variables.coverage,
  };
  const findings = [
    ...linted,
    ...unusedProperties(usage),
    ...notFilledInFindings(usage),
  ];
  return { findings, ...usageVerdicts(usage) };
}
