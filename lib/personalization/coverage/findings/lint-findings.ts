import type { ISurveyVariablePresets } from "survey-core";
import type { ILintFinding } from "survey-core/linter";
import {
  isUnknownRoot,
  LINT_RULE,
  lintRules,
  runLint,
} from "@/lib/survey-features/survey-lint";
import type { AudienceFinding } from "./types";

// survey-core 3.2.2 checks types and choices against question references only, never a variable,
// so expression/type-mismatch and expression/unknown-choice have nothing to say about Properties.
// Built once: every review lints twice (here and in undeclaredReferences).
const AUDIENCE_RULES = lintRules([LINT_RULE.unknown, LINT_RULE.collision]);

function toFinding(finding: ILintFinding): AudienceFinding | null {
  const data = finding.messageData;
  const at = { path: finding.path, elementName: finding.elementName };
  if (isUnknownRoot(finding)) {
    return {
      kind: "unknown-variable",
      variable: String(data.root ?? data.name),
      ...at,
      suggestion: finding.suggestion,
      fix: finding.fix,
    };
  }
  if (finding.ruleId !== LINT_RULE.collision) return null;
  return {
    kind: "variable-collision",
    variable: String(data.variable ?? data.name),
    ...at,
    declaredBy: data.kind === "question" ? "question" : "calculatedValue",
  };
}

/**
 * Unknown references and collisions from survey-core's linter, given the variables as a plain
 * presets object. Calculated values (the designer's custom variables) count as declared there.
 */
export function lintFindings(
  json: object,
  presets: ISurveyVariablePresets,
): AudienceFinding[] {
  return runLint(json, AUDIENCE_RULES, presets)
    .map((finding) => toFinding(finding))
    .filter((finding): finding is AudienceFinding => finding !== null);
}
