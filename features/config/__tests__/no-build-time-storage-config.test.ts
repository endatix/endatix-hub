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

/**
 * Every key `withEndatix` may put in `nextConfig.env`. A key added here is inlined into
 * the published image at build: it must never be something an operator sets per deployment.
 */
const ALLOWED_BUILD_ENV_KEYS = [
  "AUTH_KEYCLOAK_CLIENT_ID",
  "AUTH_KEYCLOAK_ENABLED",
  "AUTH_KEYCLOAK_ISSUER",
  "SESSION_MAX_AGE_IN_MINUTES",
];

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

  it.each([
    ["no storage env", {}],
    ["S3 storage env", RUNTIME_S3_ENV],
  ])(
    "nextConfig.env holds only the allowed build-time keys when built with %s",
    (_label, buildEnv) => {
      Object.assign(process.env, buildEnv);

      const built = withEndatix({});

      expect(
        Object.keys(built.env ?? {}).sort(),
        "nextConfig.env keys are inlined into the image at build. Storage and other " +
          "per-deployment settings must be read from process.env at runtime instead.",
      ).toEqual(ALLOWED_BUILD_ENV_KEYS);
    },
  );

  it("enables the provider from runtime env on an image built without storage", () => {
    const built = withEndatix({});

    // Runtime of the published image: the operator's env, overridden by the build's
    // nextConfig.env, since the inlined literal wins over anything set at runtime.
    process.env = { ...process.env, ...RUNTIME_S3_ENV, ...built.env };
    resetResolveEndatixSettingsCacheForTests();

    const profile = getRuntimeStorageProfile();
    expect(profile.provider).toBe("s3");
    expect(profile.s3CredentialsPresent).toBe(true);
  });
});
