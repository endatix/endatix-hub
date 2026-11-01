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

const COLLISION_RULES = lintRules([LINT_RULE.collision]);

/** What already writes a variable's data key: a root question, or a calculated value. */
export type VariableCollision = {
  variable: string;
  declaredBy: "question" | "calculatedValue";
};

/**
 * The names a form already writes as data, so a variable of that name would overwrite them:
 * survey-core's `variable/collision` rule, with the names as the variable definition. Matched
 * without case, and returned as given, in their order.
 */
export function variableCollisions(
  json: object,
  names: readonly string[],
): VariableCollision[] {
  const declared = declaredVariables(json, names);
  return names.flatMap((variable) => {
    const declaredBy = declared.get(variable.toLowerCase());
    return declaredBy ? [{ variable, declaredBy }] : [];
  });
}

/** What writes each of the names, by lower-case name, linted with them as the variable definition. */
function declaredVariables(json: object, names: readonly string[]) {
  const definition = {
    elements: names.map((name) => ({ type: "text", name })),
  };
  const findings = runLint(json, COLLISION_RULES, { definition, presets: [] });
  return new Map(
    findings.map(({ messageData: { variable, kind } }) => [
      String(variable).toLowerCase(),
      kind === "question"
        ? ("question" as const)
        : ("calculatedValue" as const),
    ]),
  );
}
