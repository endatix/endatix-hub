import {
  SurveyVariablePresets,
  type ISurveyVariablePresets,
} from "survey-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { undeclaredReferences } from "@/lib/survey-features/survey-lint";
import { toSurveyPresets } from "../to-survey-presets";
import type { AudienceUsage } from "./audience-usage";
import { lintFindings } from "./findings/lint-findings";
import type { AudienceFinding } from "./findings/types";

function variableNamesOf(presets: ISurveyVariablePresets) {
  const model = new SurveyVariablePresets(presets);
  try {
    return model.getVariableNames();
  } finally {
    model.dispose();
  }
}

/** Every name the form reads: the undeclared references, and the names a question also declares. */
function readBy(surveyJson: object, linted: AudienceFinding[]): Set<string> {
  const read = undeclaredReferences(surveyJson);
  for (const finding of linted) {
    if (finding.kind === "variable-collision") {
      read.add(finding.variable.toLowerCase());
    }
  }
  return read;
}

/**
 * The linter's findings and what the form reads of its Properties, from one lint; `null` when the
 * form has no Properties.
 */
export function lintedUsage(
  surveyJson: object,
  variables: AudienceVariables,
): { findings: AudienceFinding[]; usage: AudienceUsage } | null {
  if (!variables.variablePresets) return null;
  const presets = toSurveyPresets(variables.variablePresets);
  const findings = lintFindings(surveyJson, presets);
  const read = readBy(surveyJson, findings);
  const variableNames = variableNamesOf(presets);
  const usage = {
    variableNames,
    read: variableNames
      .map((name) => name.toLowerCase())
      .filter((key) => read.has(key)),
    coverage: variables.coverage,
  };
  return { findings, usage };
}

/** What the saved form reads of its Properties; `null` when the form has no Properties. */
export function audienceUsage(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceUsage | null {
  return lintedUsage(surveyJson, variables)?.usage ?? null;
}
