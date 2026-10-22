import type { ISurveyVariablePresets } from "survey-core";
import {
  getRules,
  lintSurvey,
  type ILintFinding,
  type LintSeverity,
} from "survey-core/linter";
import type { AudienceFinding } from "./types";

const UNKNOWN = "reference/unknown";
const COLLISION = "variable/collision";
const TYPE_RULES = new Set([
  "expression/type-mismatch",
  "expression/unknown-choice",
]);
const KEPT = new Set([UNKNOWN, COLLISION, ...TYPE_RULES]);

/** Only the rules the Audience reports; the rest of the linter stays off. */
function onlyRules(kept: Set<string>): Record<string, LintSeverity> {
  return Object.fromEntries(
    getRules().map((rule) => [rule.id, kept.has(rule.id) ? "warning" : "off"]),
  );
}

/** The linter's `{name}` root: `{tier.label}` is `tier`. */
function referenceName(finding: ILintFinding): string {
  const data = finding.messageData;
  return String(data.root ?? data.name ?? data.variable ?? "");
}

function toFinding(
  finding: ILintFinding,
  variableNames: Set<string>,
): AudienceFinding | null {
  const at = { path: finding.path, elementName: finding.elementName };
  const variable = referenceName(finding);
  if (finding.ruleId === UNKNOWN) {
    return {
      kind: "unknown-variable",
      variable,
      ...at,
      suggestion: finding.suggestion,
      fix: finding.fix,
    };
  }
  if (finding.ruleId === COLLISION) {
    return { kind: "variable-collision", variable, ...at };
  }
  // survey-core 3.2.2 raises these for question references only; keep the ones about a variable.
  if (
    TYPE_RULES.has(finding.ruleId) &&
    variableNames.has(variable.toLowerCase())
  ) {
    return { kind: "type-mismatch", variable, ...at, message: finding.message };
  }
  return null;
}

/**
 * Unknown references, collisions and type checks from survey-core's linter, given the variables as
 * a plain presets object. Custom variables (calculated values) count as declared there.
 */
export function lintFindings(
  json: object,
  presets: ISurveyVariablePresets,
  variableNames: Set<string>,
): AudienceFinding[] {
  const { findings } = lintSurvey(json, {
    variablePresets: presets,
    rules: onlyRules(KEPT),
  });
  return findings
    .map((finding) => toFinding(finding, variableNames))
    .filter((finding): finding is AudienceFinding => finding !== null);
}

/**
 * Every `{name}` root the form reads that no question, panel or calculated value declares: the
 * linter's reference walk (expressions, piped texts, defaults, triggers), with no variables declared.
 */
export function undeclaredReferences(json: object): Set<string> {
  const { findings } = lintSurvey(json, {
    rules: onlyRules(new Set([UNKNOWN])),
  });
  return new Set(
    findings.map((finding) => referenceName(finding).toLowerCase()),
  );
}
