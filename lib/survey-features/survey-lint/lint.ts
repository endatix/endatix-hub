import type { ISurveyVariablePresets } from "survey-core";
import {
  getRules,
  lintSurvey,
  type ILintFinding,
  type LintSeverity,
} from "survey-core/linter";

export const LINT_RULE = {
  unknown: "reference/unknown",
  collision: "variable/collision",
} as const;

/** A `{name}` whose root nothing declares; an unknown segment inside a question is not ours. */
const NOT_FOUND = "notFound";

/** Only the given rules, as warnings; the rest of the linter stays off. */
export function lintRules(kept: string[]): Record<string, LintSeverity> {
  return Object.fromEntries(
    getRules().map((rule) => [
      rule.id,
      kept.includes(rule.id) ? "warning" : "off",
    ]),
  );
}

const UNKNOWN_RULES = lintRules([LINT_RULE.unknown]);

/** The findings of the given rules; with presets, their variables count as declared. */
export function runLint(
  json: object,
  rules: Record<string, LintSeverity>,
  variablePresets?: ISurveyVariablePresets,
): ILintFinding[] {
  return lintSurvey(json, { rules, variablePresets }).findings;
}

export function isUnknownRoot(finding: ILintFinding): boolean {
  return finding.ruleId === LINT_RULE.unknown && finding.reason === NOT_FOUND;
}

/**
 * Every `{name}` root the form reads that no question, panel or calculated value declares: the
 * linter's reference walk (expressions, piped texts, defaults, triggers), with no variables declared.
 */
export function undeclaredReferences(json: object): Set<string> {
  return new Set(
    runLint(json, UNKNOWN_RULES)
      .filter((finding) => isUnknownRoot(finding))
      .map((finding) => String(finding.messageData.root).toLowerCase()),
  );
}
