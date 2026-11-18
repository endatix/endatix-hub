import { ESLint } from "eslint";
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
});
