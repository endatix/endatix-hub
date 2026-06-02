// @vitest-environment node

import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAuthProvider } from "../types";
import { ISupportsFederatedLogout } from "../federated-logout.types";

const mocks = vi.hoisted(() => ({
  getProvider: vi.fn(),
}));

vi.mock("../auth-provider-registry", () => ({
  authRegistry: {
    getProvider: mocks.getProvider,
  },
}));

import { resolveFederatedLogoutUrl } from "../auth-logout.utils";

describe("resolveFederatedLogoutUrl", () => {
  const token: JWT = {
    provider: "keycloak",
    id_token: "id-token",
  };

  const mockProvider: ISupportsFederatedLogout = {
    resolveFederatedLogoutUrl: vi.fn(),
  };

  beforeEach(() => {
    process.env.AUTH_URL = "https://hub.endatix.test";
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    mocks.getProvider.mockReturnValue(
      mockProvider as IAuthProvider & ISupportsFederatedLogout,
    );
    vi.mocked(mockProvider.resolveFederatedLogoutUrl).mockReturnValue(
      "https://idp.endatix.test/logout",
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_URL;
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });

  it("delegates federated logout URL resolution to the active auth provider", () => {
    const logoutUrl = resolveFederatedLogoutUrl(token);

    expect(mocks.getProvider).toHaveBeenCalledWith("keycloak");
    expect(mockProvider.resolveFederatedLogoutUrl).toHaveBeenCalledWith({
      token,
      postLogoutRedirectUri: "https://hub.endatix.test/signin",
    });
    expect(logoutUrl).toBe("https://idp.endatix.test/logout");
  });

  it("returns null when the provider does not support federated logout", () => {
    mocks.getProvider.mockReturnValue(undefined);

    expect(resolveFederatedLogoutUrl(token)).toBeNull();
  });

  it("returns null when there is no JWT", () => {
    expect(resolveFederatedLogoutUrl(null)).toBeNull();
    expect(mocks.getProvider).not.toHaveBeenCalled();
  });

  it("returns null when AUTH_URL is not a valid URL", () => {
    process.env.AUTH_URL = "not-a-valid-url";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const logoutUrl = resolveFederatedLogoutUrl(token);

    expect(logoutUrl).toBeNull();
    expect(mocks.getProvider).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Federated logout requested but AUTH_URL is not a valid URL",
    );

    warnSpy.mockRestore();
  });

  it("returns null when the provider fails to resolve federated logout", () => {
    const error = new Error("Provider logout failed");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(mockProvider.resolveFederatedLogoutUrl).mockImplementation(() => {
      throw error;
    });

    const logoutUrl = resolveFederatedLogoutUrl(token);

    expect(logoutUrl).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to resolve federated logout URL",
      error,
    );

    warnSpy.mockRestore();
  });
});
