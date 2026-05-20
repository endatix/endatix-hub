import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storageRegistry } from "../../core";
import { MissingConfigurationError } from "@/lib/hosting/storage-configuration-errors";

vi.mock("@/features/config/resolve-endatix-settings", () => ({
  getRuntimeStorageProfile: vi.fn(),
}));

import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { registerStorageProviders } from "../register-providers";

describe("registerStorageProviders", () => {
  const originalEnv = { ...process.env };
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    storageRegistry.reset();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    storageRegistry.reset();
    warnSpy.mockClear();
  });

  it("throws when STORAGE_PROVIDER=azure but credentials are missing", () => {
    vi.mocked(getRuntimeStorageProfile).mockReturnValue({
      provider: "azure",
      invalidProviderRaw: null,
      azureCredentialsPresent: false,
      s3CredentialsPresent: false,
      imageRemoteHostnames: [],
    });

    expect(() => registerStorageProviders()).toThrow(MissingConfigurationError);
    expect(storageRegistry.getActiveProvider()).toBeNull();
  });

  it("does not register or warn when provider is none (unset default)", () => {
    vi.mocked(getRuntimeStorageProfile).mockReturnValue({
      provider: "none",
      invalidProviderRaw: null,
      azureCredentialsPresent: true,
      s3CredentialsPresent: false,
      imageRemoteHostnames: [],
    });

    registerStorageProviders();

    expect(storageRegistry.getActiveProvider()).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
