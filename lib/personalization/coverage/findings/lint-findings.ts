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

// OSS `Property.Slugify`: lower-case ASCII letters and digits, any other run becomes one `_`. A name
// that slug keeps (case aside, since variables match case-insensitively) is declared by a Property
// named after it.
const KEPT_BY_SLUG = /^[a-z0-9]+(?:_[a-z0-9]+)*$/i;

function unknownVariable(finding: ILintFinding): AudienceFinding {
  const data = finding.messageData;
  const variable = String(data.root ?? data.name);
  return {
    kind: "unknown-variable",
    variable,
    path: finding.path,
    elementName: finding.elementName,
    suggestion: finding.suggestion,
    fix: finding.fix,
    canAddProperty: KEPT_BY_SLUG.test(variable),
  };
}

function toFinding(finding: ILintFinding): AudienceFinding | null {
  const data = finding.messageData;
  const at = { path: finding.path, elementName: finding.elementName };
  if (isUnknownRoot(finding)) return unknownVariable(finding);
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
