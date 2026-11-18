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

function envBlock(): string {
  const start = deployment.indexOf("env:");
  return deployment.slice(
    start,
    deployment.indexOf("{{- with .Values.extraEnv }}", start),
  );
}

describe("helm white-labeling", () => {
  test("values default the flag off and mount no pack", () => {
    // Assert
    expect(values).toMatch(/^whiteLabeling:\n(?:\s+#.*\n)*\s+enabled: false$/m);
    expect(values).toMatch(
      /^brandPack:\n(?:\s+#.*\n|\s+\w+: .*\n)*\s+configMap: ""$/m,
    );
    expect(values).toMatch(
      /^brandPack:\n(?:\s+#.*\n|\s+\w+: .*\n)*\s+volume: \{\}$/m,
    );
    expect(values).toMatch(/^\s+mountPath: \/etc\/endatix\/brand$/m);
  });

  test("whiteLabeling.enabled sets the Hub flag before extraEnv", () => {
    // Act
    const env = envBlock();

    // Assert
    expect(env).toContain("- name: FLAG_WHITE_LABELING");
    expect(env).toContain("value: {{ .Values.whiteLabeling.enabled | quote }}");
  });

  test("a brand pack sets ENDATIX_BRAND_DIR to its mount path, only when one is mounted", () => {
    // Act
    const env = envBlock();

    // Assert
    expect(env).toMatch(
      /\{\{- if \$brandPackMounted \}\}\s+- name: ENDATIX_BRAND_DIR\s+value: \{\{ \.Values\.brandPack\.mountPath \| quote \}\}\s+\{\{- end \}\}/,
    );
  });

  test("the pack is mounted read-only from a ConfigMap or a volume source", () => {
    // Assert
    expect(deployment).toMatch(
      /- name: brand-pack\s+mountPath: \{\{ \.Values\.brandPack\.mountPath \| quote \}\}\s+readOnly: true/,
    );
    expect(deployment).toMatch(
      /- name: brand-pack\s+configMap:\s+name: \{\{ \.Values\.brandPack\.configMap \| quote \}\}/,
    );
    expect(deployment).toContain(
      "{{- toYaml .Values.brandPack.volume | nindent 10 }}",
    );
  });

  test("setting both a ConfigMap and a volume fails the render", () => {
    // Assert
    expect(deployment).toContain(
      'fail "Set brandPack.configMap or brandPack.volume, not both."',
    );
  });
});
