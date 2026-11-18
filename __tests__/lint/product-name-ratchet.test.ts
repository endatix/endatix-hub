import { readFileSync } from "node:fs";
import { ESLint } from "eslint";
import {
  PRODUCT_NAME_PATTERN,
  productNameBaseline,
} from "@/eslint/product-name-baseline.mjs";
import { describe, expect, it } from "vitest";

const RULE = "no-restricted-syntax";

async function productNameErrors(code: string, filePath: string) {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
}

describe("product-name lint ratchet", () => {
  it.each([
    ["a string", 'export const title = "About Endatix";\n'],
    ["a template", "export const label = `${1} Endatix API`;\n"],
    ["a link", 'export const url = "https://endatix.com/pricing";\n'],
    [
      "a GitHub link",
      'export const url = "https://github.com/endatix/endatix/issues";\n',
    ],
    [
      "JSX text",
      "export function Hero() {\n  return <h2>Welcome to Endatix</h2>;\n}\n",
    ],
  ])("fails on a new hard-coded product name in %s", async (_, code) => {
    const errors = await productNameErrors(
      code,
      "features/example/ui/example.tsx",
    );

    expect(errors).toHaveLength(1);
  });

  it("allows identifiers and package names that contain the word", async () => {
    const errors = await productNameErrors(
      'import { getClientEndatixConfig } from "@/features/config/server";\nexport const pkg = "@endatix/hub";\nexport const read = getClientEndatixConfig;\n',
      "features/example/ui/example.tsx",
    );

    expect(errors).toHaveLength(0);
  });

  it("leaves lib/branding, where the built-in brand lives, alone", async () => {
    const errors = await productNameErrors(
      'export const name = "Endatix Hub";\n',
      "lib/branding/example.ts",
    );

    expect(errors).toHaveLength(0);
  });

  it("pins the baseline: it only shrinks, one file per entry", () => {
    // Removing an entry is the only allowed change. Adding one means editing this list too:
    // brand the string instead.
    expect(productNameBaseline).toEqual([
      "app/(public)/share/layout.tsx",
      String.raw`app/(public)/embed/\[formId\]/layout.tsx`,
      "components/public-status/powered-by.tsx",
      "components/public-status/public-status-page.tsx",
      "features/config/api-config.ts",
      "features/config/experimental-config.ts",
      "features/auth/use-cases/view-settings-summary/auth-settings-drift.ts",
      "features/auth/infrastructure/providers/endatix-auth-provider.ts",
      "features/embed-form/ui/use-survey-embed-behavior.ts",
      "lib/survey-extensions/core-registry.ts",
      "lib/survey-extensions/server/analyzer.ts",
      "lib/hosting/check-node-version.ts",
      "lib/endatix-api/endatix-api.ts",
      "features/audience/generate-links/personal-links.ts",
      "features/audience/reissue-link/reissue-audience-link.action.ts",
      "features/audience/copy-test-link/create-test-link.action.ts",
    ]);
  });

  it.each(productNameBaseline)(
    "drops %s from the baseline once it no longer names Endatix",
    (entry) => {
      const file = entry.replaceAll("\\", "");
      const pattern = new RegExp(PRODUCT_NAME_PATTERN.slice(1, -1));

      expect(pattern.test(readFileSync(file, "utf8"))).toBe(true);
    },
  );
});
