import type { ISurveyVariablePresets } from "survey-core";
import {
  getRules,
  lintSurvey,
  type ILintFinding,
  type LintSeverity,
} from "survey-core/linter";
import type { AudienceFinding } from "./types";

// survey-core 3.2.2 checks types and choices against question references only, never a variable,
// so expression/type-mismatch and expression/unknown-choice have nothing to say about Properties.
const UNKNOWN = "reference/unknown";
const COLLISION = "variable/collision";
/** A `{name}` whose root nothing declares; an unknown segment inside a question is not ours. */
const NOT_FOUND = "notFound";

/** Only the given rules, as warnings; the rest of the linter stays off. */
function onlyRules(kept: string[]): Record<string, LintSeverity> {
  return Object.fromEntries(
    getRules().map((rule) => [
      rule.id,
      kept.includes(rule.id) ? "warning" : "off",
    ]),
  );
}

function isUnknownRoot(finding: ILintFinding): boolean {
  return finding.ruleId === UNKNOWN && finding.reason === NOT_FOUND;
}

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
  if (finding.ruleId !== COLLISION) return null;
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
  const { findings } = lintSurvey(json, {
    variablePresets: presets,
    rules: onlyRules([UNKNOWN, COLLISION]),
  });
  return findings
    .map(toFinding)
    .filter((finding): finding is AudienceFinding => finding !== null);
}

/**
 * Every `{name}` root the form reads that no question, panel or calculated value declares: the
 * linter's reference walk (expressions, piped texts, defaults, triggers), with no variables declared.
 */
export function undeclaredReferences(json: object): Set<string> {
  const { findings } = lintSurvey(json, { rules: onlyRules([UNKNOWN]) });
  return new Set(
    findings
      .filter(isUnknownRoot)
      .map((finding) => String(finding.messageData.root).toLowerCase()),
  );
}
