import { describe, expect, it } from "vitest";
import {
  annotations,
  evaluateGate,
  parseAdvisoryMetrics,
  parseReportTask,
  summaryMarkdown,
} from "../lib/sonar-gate.mjs";

const ADVISORY = ["new_duplicated_lines_density"];

function condition(
  metricKey: string,
  status: "OK" | "ERROR",
  actualValue: string,
  comparator = "GT",
  errorThreshold = "1",
) {
  return {
    status,
    metricKey,
    comparator,
    periodIndex: 1,
    errorThreshold,
    actualValue,
  };
}

function sonarWay(overrides: Record<string, "OK" | "ERROR"> = {}) {
  const status = (metric: string) => overrides[metric] ?? "OK";
  const conditions = [
    condition("new_reliability_rating", status("new_reliability_rating"), "1"),
    condition("new_security_rating", status("new_security_rating"), "1"),
    condition(
      "new_maintainability_rating",
      status("new_maintainability_rating"),
      "1",
    ),
    condition(
      "new_coverage",
      status("new_coverage"),
      status("new_coverage") === "ERROR" ? "70.4" : "85.0",
      "LT",
      "80",
    ),
    condition(
      "new_duplicated_lines_density",
      status("new_duplicated_lines_density"),
      status("new_duplicated_lines_density") === "ERROR" ? "6.2" : "0.1",
      "GT",
      "3",
    ),
    condition(
      "new_security_hotspots_reviewed",
      status("new_security_hotspots_reviewed"),
      "100.0",
      "LT",
      "100",
    ),
  ];
  return {
    status: conditions.some((c) => c.status === "ERROR") ? "ERROR" : "OK",
    conditions,
  };
}

describe("evaluateGate", () => {
  it("passes with a warning when duplication is the only red condition", () => {
    // Act
    const result = evaluateGate(
      sonarWay({ new_duplicated_lines_density: "ERROR" }),
      ADVISORY,
    );

    // Assert
    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.warnings.map((c) => c.metricKey)).toEqual([
      "new_duplicated_lines_density",
    ]);
    expect(annotations(result)).toEqual([
      "::warning title=SonarCloud (advisory)::new_duplicated_lines_density = 6.2 (fails when > 3)",
    ]);
  });

  it("fails when coverage is red", () => {
    // Act
    const result = evaluateGate(sonarWay({ new_coverage: "ERROR" }), ADVISORY);

    // Assert
    expect(result.passed).toBe(false);
    expect(result.failures.map((c) => c.metricKey)).toEqual(["new_coverage"]);
    expect(annotations(result)).toEqual([
      "::error title=SonarCloud quality gate::new_coverage = 70.4 (fails when < 80)",
    ]);
  });

  it("fails on a red bug condition even when duplication is red too", () => {
    // Act
    const result = evaluateGate(
      sonarWay({
        new_reliability_rating: "ERROR",
        new_duplicated_lines_density: "ERROR",
      }),
      ADVISORY,
    );

    // Assert
    expect(result.passed).toBe(false);
    expect(result.failures.map((c) => c.metricKey)).toEqual([
      "new_reliability_rating",
    ]);
    expect(result.warnings.map((c) => c.metricKey)).toEqual([
      "new_duplicated_lines_density",
    ]);
  });

  it("passes with no annotations when the gate is OK", () => {
    // Act
    const result = evaluateGate(sonarWay(), ADVISORY);

    // Assert
    expect(result.passed).toBe(true);
    expect(annotations(result)).toEqual([]);
  });

  it("fails when SonarCloud reports ERROR without a red condition", () => {
    // Act & Assert
    expect(
      evaluateGate({ status: "ERROR", conditions: [] }, ADVISORY).passed,
    ).toBe(false);
  });

  it("makes duplication fail when it is removed from the advisory list", () => {
    // Act
    const result = evaluateGate(
      sonarWay({ new_duplicated_lines_density: "ERROR" }),
      parseAdvisoryMetrics(""),
    );

    // Assert
    expect(result.passed).toBe(false);
  });
});

describe("parseAdvisoryMetrics", () => {
  it("defaults to duplication when unset", () => {
    // Act & Assert
    expect(parseAdvisoryMetrics(undefined)).toEqual([
      "new_duplicated_lines_density",
    ]);
  });

  it("splits and trims a comma-separated list", () => {
    // Act & Assert
    expect(
      parseAdvisoryMetrics(" new_duplicated_lines_density , new_coverage "),
    ).toEqual(["new_duplicated_lines_density", "new_coverage"]);
  });
});

describe("parseReportTask", () => {
  it("reads the scanner's key=value lines, keeping '=' inside values", () => {
    // Act
    const report = parseReportTask(
      [
        "organization=endatix",
        "projectKey=endatix_endatix-hub",
        "serverUrl=https://sonarcloud.io",
        "dashboardUrl=https://sonarcloud.io/dashboard?id=endatix_endatix-hub&pullRequest=1",
        "ceTaskId=AZ-task",
        "",
      ].join("\n"),
    );

    // Assert
    expect(report.serverUrl).toBe("https://sonarcloud.io");
    expect(report.ceTaskId).toBe("AZ-task");
    expect(report.dashboardUrl).toBe(
      "https://sonarcloud.io/dashboard?id=endatix_endatix-hub&pullRequest=1",
    );
  });
});

describe("summaryMarkdown", () => {
  it("marks duplication as an advisory warning in the table", () => {
    // Arrange
    const result = evaluateGate(
      sonarWay({ new_duplicated_lines_density: "ERROR" }),
      ADVISORY,
    );

    // Act
    const markdown = summaryMarkdown(
      result,
      ADVISORY,
      "https://sonarcloud.io/dashboard?id=x",
    );

    // Assert
    expect(markdown).toContain(
      "### SonarCloud quality gate: ✅ Passed with warnings",
    );
    expect(markdown).toContain(
      "| new_duplicated_lines_density (advisory) | 6.2 | > 3 | ⚠️ warning |",
    );
    expect(markdown).toContain("| new_coverage | 85.0 | < 80 | ✅ ok |");
  });
});
