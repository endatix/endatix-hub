import { readFileSync } from "node:fs";
import path from "node:path";

export const HUB_ROOT = path.resolve(import.meta.dirname, "../../..");

/** A custom property as app/globals.css declares it in `:root` or `.dark`. */
export function builtInToken(
  selector: ":root" | ".dark",
  name: string,
): string | undefined {
  const css = readFileSync(path.join(HUB_ROOT, "app/globals.css"), "utf8");
  const block = new RegExp(
    `^${selector.replace(".", "\\.")} \\{([\\s\\S]*?)\\n\\}`,
    "m",
  ).exec(css)?.[1];
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(block ?? "")?.[1].trim();
}
