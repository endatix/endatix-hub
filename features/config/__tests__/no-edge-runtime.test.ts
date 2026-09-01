import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceFiles } from "./support/scan-source-files";

const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * `applyLegacyPublicEnv()` runs from `instrumentation.ts` under
 * `NEXT_RUNTIME === "nodejs"` only. That is sound solely because this app has no edge
 * runtime: `proxy.ts` compiles to `runtime: "nodejs"` (the Next 16 default) and no route
 * opts into edge, so every process that reads config has been through the shim.
 *
 * The moment something declares `runtime = "edge"`, that stops being true and the
 * deprecated `NEXT_PUBLIC_*` names silently stop resolving there. The fix at that point is
 * NOT to import the shim into the edge branch — Next inlines `NEXT_PUBLIC_`-prefixed
 * literals into the edge bundle at build time, so it would fold the build machine's values
 * rather than the container's. Pass the resolved values into the edge module instead.
 */
describe("deprecated env shim covers every runtime", () => {
  it("has no module opting into the edge runtime", () => {
    const offenders = scanSourceFiles(
      REPO_ROOT,
      /export\s+const\s+runtime\s*=\s*["']edge["']/,
    );

    expect(
      offenders,
      "These modules run on the edge runtime, where instrumentation.ts never calls " +
        "applyLegacyPublicEnv(), so deprecated NEXT_PUBLIC_* names do not resolve. " +
        "Pass the resolved config into the edge module — do not import the shim there, " +
        "because Next inlines NEXT_PUBLIC_ literals into the edge bundle at build time.",
    ).toEqual([]);
  });
});
