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

describe("helm analytics env vars", () => {
  test("values expose the PostHog token under its current name", () => {
    expect(values).toContain('posthogProjectToken: ""');
    expect(values).not.toMatch(/^\s*posthogKey:/m);
  });

  test("deployment maps that value onto POSTHOG_PROJECT_TOKEN", () => {
    expect(deployment).toContain("- name: POSTHOG_PROJECT_TOKEN");
    expect(deployment).toContain(".Values.analytics.posthogProjectToken");
  });

  // Helm ignores unknown values, so without this the rename would disable analytics silently.
  test("rendering fails when the retired posthogKey is still set", () => {
    expect(deployment).toContain("{{- if .Values.analytics.posthogKey }}");
    expect(deployment).toContain(
      'fail "analytics.posthogKey was renamed to analytics.posthogProjectToken."',
    );
  });

  test("the Secret key keeps its name so existing Secrets keep working", () => {
    expect(deployment).toContain("key: posthog-key");
  });
});

describe("helm signup review Visitor env vars", () => {
  // An `env` entry outranks `envFrom` even when empty, so an always-rendered one
  // would stop extraEnvFrom from supplying the value.
  test("POSTHOG_PROJECT_ID is rendered only when posthogProjectId is set", () => {
    // Arrange
    const guard = "{{- with .Values.analytics.posthogProjectId }}";

    // Act
    const guardIndex = deployment.indexOf(guard);
    const entryIndex = deployment.indexOf("- name: POSTHOG_PROJECT_ID");
    const guardEnd = deployment.indexOf("{{- end }}", entryIndex);

    // Assert
    expect(guardIndex).toBeGreaterThan(-1);
    expect(entryIndex).toBeGreaterThan(guardIndex);
    expect(guardEnd).toBeGreaterThan(entryIndex);
  });

  // A bare number in a values file is a float64, which `quote` prints as 1.234567e+06.
  test("the project id is rendered as an integer", () => {
    // Arrange
    const integerCast = "{{- $projectId := . | int64 }}";

    // Act
    const castsToInteger = deployment.includes(integerCast);

    // Assert
    expect(castsToInteger).toBe(true);
    expect(deployment).toContain("value: {{ $projectId | quote }}");
  });

  test("POSTHOG_PERSONAL_API_KEY comes only from its own Secret", () => {
    // Arrange
    const guard = "{{- with .Values.analytics.personalApiKeySecretName }}";

    // Act
    const guardIndex = deployment.indexOf(guard);
    const entryIndex = deployment.indexOf("- name: POSTHOG_PERSONAL_API_KEY");
    const entry = deployment.slice(
      entryIndex,
      deployment.indexOf("{{- end }}", entryIndex),
    );

    // Assert
    expect(guardIndex).toBeGreaterThan(-1);
    expect(entryIndex).toBeGreaterThan(guardIndex);
    expect(entry).toContain("secretKeyRef:");
    expect(entry).toContain("key: posthog-personal-api-key");
    expect(entry).not.toMatch(/^\s*value:/m);
  });

  // The key can read visitor emails, so a literal in a git-tracked values file is refused.
  test("rendering fails when a plaintext personal API key is set", () => {
    // Arrange
    const literalValue = /^\s*posthogPersonalApiKey:/m;

    // Act
    const valuesOfferLiteral = literalValue.test(values);

    // Assert
    expect(valuesOfferLiteral).toBe(false);
    expect(values).toContain('personalApiKeySecretName: ""');
    expect(deployment).toContain(
      "{{- if .Values.analytics.posthogPersonalApiKey }}",
    );
  });
});
