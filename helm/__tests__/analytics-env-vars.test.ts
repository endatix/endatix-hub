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
