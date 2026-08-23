import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const helmDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const helpers = readFileSync(
  path.join(helmDir, "templates/_helpers.tpl"),
  "utf8",
);
const deployment = readFileSync(
  path.join(helmDir, "templates/deployment.yaml"),
  "utf8",
);
const values = readFileSync(path.join(helmDir, "values.yaml"), "utf8");

function apiUrlBranch(): string {
  const start = helpers.indexOf("{{- if $apiUrl }}");
  const end = helpers.indexOf("{{- if $baseUrl }}");
  return helpers.slice(start, end);
}

function baseUrlBranch(): string {
  const start = helpers.indexOf("{{- if $baseUrl }}");
  const end = helpers.indexOf("{{- end -}}", start);
  return helpers.slice(start, end);
}

describe("helm api env vars", () => {
  test("deployment uses the exclusive apiEnvVars helper", () => {
    expect(deployment).toContain('include "endatix-hub.apiEnvVars"');
    expect(deployment).not.toContain("ENDATIX_API_URL");
    expect(deployment).not.toContain("ENDATIX_BASE_URL");
  });

  test("default values are apiUrl-only so a stock install emits ENDATIX_API_URL", () => {
    expect(values).toMatch(/apiUrl: "http:\/\/endatix-api:8080\/api"/);
    expect(values).toMatch(/baseUrl: ""/);
  });

  test("rejects both apiUrl and baseUrl", () => {
    expect(helpers).toContain(
      "Set exactly one of api.apiUrl or api.baseUrl (not both)",
    );
  });

  test("apiUrl override emits only ENDATIX_API_URL", () => {
    const branch = apiUrlBranch();
    expect(branch).toContain("ENDATIX_API_URL");
    expect(branch).not.toContain("ENDATIX_BASE_URL");
    expect(branch).not.toContain("ENDATIX_API_PREFIX");
  });

  test("baseUrl override emits ENDATIX_BASE_URL and ENDATIX_API_PREFIX", () => {
    const branch = baseUrlBranch();
    expect(branch).toContain("ENDATIX_BASE_URL");
    expect(branch).toContain("ENDATIX_API_PREFIX");
    expect(branch).not.toContain("ENDATIX_API_URL");
  });
});
