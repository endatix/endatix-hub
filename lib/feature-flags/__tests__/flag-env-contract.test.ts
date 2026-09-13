import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceFiles } from "@/features/config/__tests__/support/scan-source-files";

const HUB_ROOT = path.resolve(__dirname, "../../..");

describe("feature-flag env names", () => {
  it("does not read pre-v1 PostHog flag env names", () => {
    const offenders = scanSourceFiles(
      HUB_ROOT,
      /ENDATIX_POSTHOG_|ENABLE_POSTHOG_ADAPTER|NEXT_PUBLIC_POSTHOG_/,
    );

    expect(offenders).toEqual([]);
  });
});
