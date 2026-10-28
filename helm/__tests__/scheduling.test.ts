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

describe("helm pod scheduling", () => {
  test("default values leave scheduling unconstrained", () => {
    expect(values).toMatch(/^nodeSelector: \{\}$/m);
    expect(values).toMatch(/^affinity: \{\}$/m);
    expect(values).toMatch(/^tolerations: \[\]$/m);
  });

  test.each(["nodeSelector", "affinity", "tolerations"])(
    "deployment renders %s on the pod spec only when set",
    (key) => {
      expect(deployment).toContain(
        `      {{- with .Values.${key} }}\n      ${key}:\n        {{- toYaml . | nindent 8 }}\n      {{- end }}`,
      );
    },
  );
});
