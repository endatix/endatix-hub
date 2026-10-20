import { describe, expect, it } from "vitest";
import {
  evaluateGate,
  parseReportTask,
  sonarApiUrl,
} from "../lib/sonar-gate.mjs";

// Ported from endatix/endatix scripts/__tests__/sonar-gate.test.mjs; keep the two in step.

const ADVISORY = ["new_duplicated_lines_density"];

function condition(
  metricKey: string,
  status: string,
  actualValue = "1",
  errorThreshold = "1",
) {
  return { metricKey, status, actualValue, errorThreshold, comparator: "GT" };
}

// A gate red on duplication only.
const DUPLICATION_ONLY = {
  status: "ERROR",
  conditions: [
    condition("new_reliability_rating", "OK"),
    condition("new_coverage", "OK", "93.5", "80"),
    condition("new_duplicated_lines_density", "ERROR", "4.7", "3"),
  ],
};

describe("evaluateGate", () => {
  it("passes a gate red only on duplication, with a warning", () => {
    // Act
    const verdict = evaluateGate(DUPLICATION_ONLY, ADVISORY);

    // Assert
    expect(verdict.passed).toBe(true);
    expect(verdict.advisory.map((c) => c.metricKey)).toEqual([
      "new_duplicated_lines_density",
    ]);
    expect(verdict.blocking).toEqual([]);
  });

  it("fails on a red coverage condition even next to an advisory one", () => {
    // Arrange
    const status = {
      status: "ERROR",
      conditions: [
        ...DUPLICATION_ONLY.conditions,
        condition("new_coverage", "ERROR", "61.0", "80"),
      ],
    };

    // Act
    const verdict = evaluateGate(status, ADVISORY);

    // Assert
    expect(verdict.passed).toBe(false);
    expect(verdict.blocking.map((c) => c.metricKey)).toEqual(["new_coverage"]);
    expect(verdict.advisory).toHaveLength(1);
  });

  it("passes a green gate with nothing to report", () => {
    // Act
    const verdict = evaluateGate(
      { status: "OK", conditions: [condition("new_coverage", "OK")] },
      ADVISORY,
    );

    // Assert
    expect(verdict).toEqual({ passed: true, blocking: [], advisory: [] });
  });

  it("fails a red gate with no red condition, so an unknown failure is never waved through", () => {
    // Act & Assert
    expect(
      evaluateGate({ status: "ERROR", conditions: [] }, ADVISORY).passed,
    ).toBe(false);
  });
});

describe("parseReportTask", () => {
  it("reads the key=value lines the scanner writes", () => {
    // Arrange
    const text = [
      "organization=endatix",
      "projectKey=endatix_endatix-hub",
      "serverUrl=https://sonarcloud.io",
      "dashboardUrl=https://sonarcloud.io/dashboard?id=endatix_endatix-hub&pullRequest=1160",
      "ceTaskId=AZ1",
      "ceTaskUrl=https://sonarcloud.io/api/ce/task?id=AZ1",
    ].join("\n");

    // Act
    const task = parseReportTask(text);

    // Assert
    expect(task.ceTaskId).toBe("AZ1");
    expect(task.ceTaskUrl).toBe("https://sonarcloud.io/api/ce/task?id=AZ1");
    expect(task.dashboardUrl).toBe(
      "https://sonarcloud.io/dashboard?id=endatix_endatix-hub&pullRequest=1160",
    );
  });
});

describe("sonarApiUrl", () => {
  it("keeps the fixed host and puts report values in the query only", () => {
    // Act & Assert
    expect(
      sonarApiUrl("https://sonarcloud.io", "/api/ce/task", {
        id: "AZ1@evil.example/x?y",
      }),
    ).toBe("https://sonarcloud.io/api/ce/task?id=AZ1%40evil.example%2Fx%3Fy");
    expect(() =>
      sonarApiUrl("https://sonarcloud.io", "/api/ce/task", { id: undefined }),
    ).toThrow(/no id/);
  });
});
