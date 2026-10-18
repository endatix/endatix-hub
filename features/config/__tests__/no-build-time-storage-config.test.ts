import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withEndatix } from "../endatix-config";
import {
  getRuntimeStorageProfile,
  resetResolveEndatixSettingsCacheForTests,
} from "../resolve-endatix-settings";

/**
 * The published image is built with no `STORAGE_*` env and configured at runtime. Next
 * inlines every `nextConfig.env` key as a literal at build, so a storage value written
 * there is frozen into the bundle and the operator's runtime env can never reach it.
 */

/** Env names the runtime storage path reads, plus the retired `ENDATIX_RESOLVED_*` build mirror. */
const STORAGE_ENV_KEY = /STORAGE|S3|AZURE|^ENDATIX_RESOLVED_/;

const RUNTIME_S3_ENV = {
  STORAGE_PROVIDER: "s3",
  STORAGE_S3_ENDPOINT: "https://s3.example.com",
  STORAGE_S3_ACCESS_KEY_ID: "key",
  STORAGE_S3_SECRET_ACCESS_KEY: "secret",
};

function clearStorageEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (STORAGE_ENV_KEY.test(key)) {
      delete process.env[key];
    }
  }
}

describe("storage config stays runtime", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearStorageEnv();
    resetResolveEndatixSettingsCacheForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetResolveEndatixSettingsCacheForTests();
  });

  it("writes no storage key into nextConfig.env", () => {
    const built = withEndatix({});

    expect(
      Object.keys(built.env ?? {}).filter((key) => STORAGE_ENV_KEY.test(key)),
      "nextConfig.env keys are inlined at build, so storage would be frozen to the " +
        "build machine's env. Read storage from process.env at runtime instead.",
    ).toEqual([]);
  });

  it("enables the provider from runtime env on an image built without storage", () => {
    const built = withEndatix({});

    // Runtime of the published image: the build's nextConfig.env (inlined), plus the
    // operator's env.
    process.env = { ...process.env, ...built.env, ...RUNTIME_S3_ENV };
    resetResolveEndatixSettingsCacheForTests();

    const profile = getRuntimeStorageProfile();
    expect(profile.provider).toBe("s3");
    expect(profile.s3CredentialsPresent).toBe(true);
  });
});
