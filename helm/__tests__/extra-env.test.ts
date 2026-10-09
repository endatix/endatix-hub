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
    // Arrange
    const extraEnvDefault = /^extraEnv: \[\]$/m;
    const extraEnvFromDefault = /^extraEnvFrom: \[\]$/m;

    // Act
    const hasExtraEnvDefault = extraEnvDefault.test(values);
    const hasExtraEnvFromDefault = extraEnvFromDefault.test(values);

    // Assert
    expect(hasExtraEnvDefault).toBe(true);
    expect(hasExtraEnvFromDefault).toBe(true);
  });

  // $(VAR) can only reference chart variables declared before extraEnv.
  test("no chart-owned env var is declared after extraEnv", () => {
    // Arrange
    const extraEnvIndex = deployment.indexOf("{{- with .Values.extraEnv }}");
    const containerEnvEnd = deployment.indexOf("resources:", extraEnvIndex);

    // Act
    const afterExtraEnv = deployment.slice(extraEnvIndex, containerEnvEnd);

    // Assert
    expect(extraEnvIndex).toBeGreaterThan(-1);
    expect(containerEnvEnd).toBeGreaterThan(extraEnvIndex);
    expect(afterExtraEnv).not.toContain("- name:");
  });

  test("extraEnvFrom renders as the container's envFrom", () => {
    // Arrange
    const envFromBlock =
      /\{\{- with \.Values\.extraEnvFrom \}\}\s+(#.*\s+)*envFrom:/;

    // Act
    const rendersEnvFrom = envFromBlock.test(deployment);

    // Assert
    expect(rendersEnvFrom).toBe(true);
  });
});
