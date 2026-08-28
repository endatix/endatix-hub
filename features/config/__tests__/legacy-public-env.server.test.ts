import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyLegacyPublicEnv } from "../legacy-public-env.server";

const TOUCHED = [
  "ENDATIX_SURVEY_LICENSE_KEY",
  "ENDATIX_RECAPTCHA_SITE_KEY",
  "ENDATIX_POSTHOG_HOST",
  "ENDATIX_IS_DEBUG_MODE",
  "NEXT_PUBLIC_SLK",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_IS_DEBUG_MODE",
];

describe("applyLegacyPublicEnv", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(TOUCHED.map((key) => [key, process.env[key]]));
    TOUCHED.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("fills an unset current name from its deprecated counterpart", () => {
    // Arrange
    process.env.NEXT_PUBLIC_SLK = "legacy-licence";

    // Act
    const applied = applyLegacyPublicEnv();

    // Assert
    expect(process.env.ENDATIX_SURVEY_LICENSE_KEY).toBe("legacy-licence");
    expect(applied).toContain("NEXT_PUBLIC_SLK -> ENDATIX_SURVEY_LICENSE_KEY");
  });

  it("never overwrites a current name that is already set", () => {
    // Arrange
    process.env.ENDATIX_RECAPTCHA_SITE_KEY = "current-key";
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "legacy-key";

    // Act
    applyLegacyPublicEnv();

    // Assert
    expect(process.env.ENDATIX_RECAPTCHA_SITE_KEY).toBe("current-key");
  });

  it("treats an explicit current value equal to the default as set", () => {
    // Guards the precedence bug the read-time merge had: a current value that happens to
    // match the default must still win over a custom deprecated one.
    // Arrange
    process.env.ENDATIX_POSTHOG_HOST = "https://us.i.posthog.com";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://legacy.posthog.example";

    // Act
    applyLegacyPublicEnv();

    // Assert
    expect(process.env.ENDATIX_POSTHOG_HOST).toBe("https://us.i.posthog.com");
  });

  it("treats a whitespace-only current value as unset", () => {
    // Arrange
    process.env.ENDATIX_IS_DEBUG_MODE = "   ";
    process.env.NEXT_PUBLIC_IS_DEBUG_MODE = "true";

    // Act
    applyLegacyPublicEnv();

    // Assert
    expect(process.env.ENDATIX_IS_DEBUG_MODE).toBe("true");
  });

  it("is idempotent", () => {
    // Arrange
    process.env.NEXT_PUBLIC_SLK = "legacy-licence";

    // Act
    applyLegacyPublicEnv();
    const secondRun = applyLegacyPublicEnv();

    // Assert
    expect(secondRun).toEqual([]);
    expect(process.env.ENDATIX_SURVEY_LICENSE_KEY).toBe("legacy-licence");
  });
});
