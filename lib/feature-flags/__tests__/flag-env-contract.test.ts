import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceFiles } from "@/features/config/__tests__/support/scan-source-files";

const HUB_ROOT = path.resolve(__dirname, "../../..");

/** Retired spellings. Current names: POSTHOG_PROJECT_TOKEN / POSTHOG_HOST / POSTHOG_UI_HOST. */
const RETIRED_POSTHOG_ENV_NAMES =
  /ENDATIX_POSTHOG_|ENABLE_POSTHOG_ADAPTER|NEXT_PUBLIC_POSTHOG_|POSTHOG_PROJECT_API_KEY/;

describe("feature-flag env names", () => {
  it("reads no retired PostHog env name", () => {
    const offenders = scanSourceFiles(HUB_ROOT, RETIRED_POSTHOG_ENV_NAMES);

    expect(offenders).toEqual([]);
  });
});
