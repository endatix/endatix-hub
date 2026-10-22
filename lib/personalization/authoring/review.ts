import { SurveyVariablePresets } from "survey-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import {
  notFilledInFindings,
  notFilledInFor,
  propertyUse,
  type CoverageInput,
} from "./findings/coverage";
import { lintFindings, undeclaredReferences } from "./findings/lint-findings";
import type { AudienceFinding, AudienceReview } from "./findings/types";
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

function collisionsIn(findings: AudienceFinding[]): Set<string> {
  return new Set(
    findings.flatMap((finding) =>
      finding.kind === "variable-collision"
        ? [finding.variable.toLowerCase()]
        : [],
    ),
  );
}

function reviewOf(
  input: CoverageInput,
  findings: AudienceFinding[],
): AudienceReview {
  return {
    findings,
    forProperty: (variableName) => propertyUse(variableName, input),
    notFilledIn: (filled) => notFilledInFor(filled, input),
  };
}

function coverageInput(
  surveyJson: object,
  presets: ReturnType<typeof toSurveyPresets>,
  coverage: AudienceVariables["coverage"],
): CoverageInput {
  return {
    variableNames: variableNamesOf(presets),
    read: undeclaredReferences(surveyJson),
    coverage,
  };
}

/**
 * The form's Audience verdicts, the same for the designer and the Audience tab: findings, and per
 * property and participant what the form reads and who filled it in. Empty without Properties (Q10).
 */
export function reviewAudience(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceReview {
  const { variablePresets, coverage } = variables;
  if (!variablePresets) {
    return reviewOf({ variableNames: [], read: new Set(), coverage }, []);
  }
  const presets = toSurveyPresets(variablePresets);
  const input = coverageInput(surveyJson, presets, coverage);
  const linted = lintFindings(surveyJson, presets);
  const unused = unusedProperties(
    input.variableNames,
    input.read,
    collisionsIn(linted),
  );
  return reviewOf(input, [...linted, ...unused, ...notFilledInFindings(input)]);
}
