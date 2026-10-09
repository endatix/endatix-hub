import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const helmDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const deployment = readFileSync(
  path.join(helmDir, "templates/deployment.yaml"),
  "utf8",
);
const values = readFileSync(path.join(helmDir, "values.yaml"), "utf8");

describe("helm extra env passthrough", () => {
  test("values default both passthrough knobs to empty", () => {
    // Assert
    expect(values).toMatch(/^extraEnv: \[\]$/m);
    expect(values).toMatch(/^extraEnvFrom: \[\]$/m);
  });

  // $(VAR) interpolation and last-declaration-wins both rely on extraEnv following the chart's own vars.
  test("extraEnv is rendered after every chart-owned env var", () => {
    // Arrange
    const lastChartVarIndex = deployment.indexOf("- name: NEXT_OTEL_VERBOSE");

    // Act
    const extraEnvIndex = deployment.indexOf("{{- with .Values.extraEnv }}");

    // Assert
    expect(lastChartVarIndex).toBeGreaterThan(-1);
    expect(extraEnvIndex).toBeGreaterThan(lastChartVarIndex);
  });

  test("extraEnvFrom renders as the container's envFrom", () => {
    // Assert
    expect(deployment).toMatch(
      /\{\{- with \.Values\.extraEnvFrom \}\}\s+(#.*\s+)*envFrom:/,
    );
  });
});
