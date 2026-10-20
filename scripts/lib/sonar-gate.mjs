// SonarCloud quality-gate policy (endatix/endatix#1319). SonarCloud Free cannot edit
// the "Sonar way" gate, so CI evaluates its conditions here instead of using
// sonar.qualitygate.wait: advisory metrics (duplication by default) only warn, every
// other red condition fails. Pure functions; the CLI in ../sonar-gate.mjs does the I/O.

/**
 * @typedef {{ status: string, metricKey: string, comparator?: string,
 *   errorThreshold?: string, actualValue?: string }} GateCondition
 * @typedef {{ status?: string, conditions?: GateCondition[] }} ProjectStatus
 * @typedef {{ passed: boolean, failures: GateCondition[], warnings: GateCondition[],
 *   conditions: GateCondition[] }} GateResult
 */

/** @type {string[]} */
export const DEFAULT_ADVISORY_METRICS = ["new_duplicated_lines_density"];

/**
 * Parses the scanner's report-task.txt (key=value lines) into an object.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseReportTask(text) {
  /** @type {Record<string, string>} */
  const entries = {};
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) {
      entries[line.slice(0, separator).trim()] = line
        .slice(separator + 1)
        .trim();
    }
  }
  return entries;
}

/**
 * Splits a comma-separated SONAR_ADVISORY_METRICS value; unset means the default.
 * @param {string | undefined} value
 * @returns {string[]}
 */
export function parseAdvisoryMetrics(value) {
  if (value === undefined) return DEFAULT_ADVISORY_METRICS;
  return value
    .split(",")
    .map((metric) => metric.trim())
    .filter(Boolean);
}

/**
 * Evaluates an api/qualitygates/project_status response.
 * @param {ProjectStatus | undefined} projectStatus
 * @param {string[]} [advisoryMetrics]
 * @returns {GateResult}
 */
export function evaluateGate(
  projectStatus,
  advisoryMetrics = DEFAULT_ADVISORY_METRICS,
) {
  const conditions = projectStatus?.conditions ?? [];
  const red = conditions.filter((condition) => condition.status === "ERROR");
  const warnings = red.filter((condition) =>
    advisoryMetrics.includes(condition.metricKey),
  );
  const failures = red.filter(
    (condition) => !advisoryMetrics.includes(condition.metricKey),
  );
  const unknownError = projectStatus?.status === "ERROR" && red.length === 0;
  return {
    passed: failures.length === 0 && !unknownError,
    failures: unknownError
      ? [{ metricKey: "quality_gate", status: "ERROR" }]
      : failures,
    warnings,
    conditions,
  };
}

/** @param {GateCondition} condition */
function describeCondition(condition) {
  const comparator = condition.comparator === "LT" ? "<" : ">";
  return `${condition.metricKey} = ${condition.actualValue} (fails when ${comparator} ${condition.errorThreshold})`;
}

/**
 * GitHub workflow commands for the warnings and failures.
 * @param {GateResult} result
 */
export function annotations(result) {
  return [
    ...result.warnings.map(
      (condition) =>
        `::warning title=SonarCloud (advisory)::${describeCondition(condition)}`,
    ),
    ...result.failures.map(
      (condition) =>
        `::error title=SonarCloud quality gate::${describeCondition(condition)}`,
    ),
  ];
}

/**
 * Markdown for $GITHUB_STEP_SUMMARY.
 * @param {GateResult} result
 * @param {string[]} advisoryMetrics
 * @param {string} [dashboardUrl]
 */
export function summaryMarkdown(result, advisoryMetrics, dashboardUrl) {
  const verdict = result.passed
    ? result.warnings.length > 0
      ? "✅ Passed with warnings"
      : "✅ Passed"
    : "❌ Failed";
  const rows = result.conditions.map((condition) => {
    const advisory = advisoryMetrics.includes(condition.metricKey);
    const outcome =
      condition.status === "ERROR"
        ? advisory
          ? "⚠️ warning"
          : "❌ fail"
        : "✅ ok";
    const comparator = condition.comparator === "LT" ? "<" : ">";
    return `| ${condition.metricKey}${advisory ? " (advisory)" : ""} | ${condition.actualValue ?? "-"} | ${comparator} ${condition.errorThreshold ?? "-"} | ${outcome} |`;
  });
  return [
    `### SonarCloud quality gate: ${verdict}`,
    "",
    "| Condition | Actual | Fails when | Result |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "Advisory metrics warn and never fail the build. Open a tech-debt issue at the third copy of a duplicated block.",
    dashboardUrl ? `\n[Open the analysis on SonarCloud](${dashboardUrl})` : "",
  ].join("\n");
}
