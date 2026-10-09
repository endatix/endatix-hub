import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProviderRegistry } from "../auth-provider-registry";
import { logAuthProviders } from "../log-auth-providers";
import type { IAuthProvider } from "../types";

vi.mock("../providers/endatix-auth-provider", () => ({
  EndatixAuthProvider: class {
    id = "endatix";
    validateConfig() {
      return false;
    }
  },
}));

function provider(id: string, valid: boolean): IAuthProvider {
  return { id, validateConfig: () => valid } as unknown as IAuthProvider;
}

function throwingProvider(id: string, error: Error): IAuthProvider {
  return {
    id,
    validateConfig: () => {
      throw error;
    },
  } as unknown as IAuthProvider;
}

describe("AuthProviderRegistry statuses", () => {
  it("reports each provider's state in registration order", () => {
    // Arrange
    const registry = new AuthProviderRegistry();
    const error = new Error("missing issuer");

    // Act
    registry.register(provider("endatix", true));
    registry.register(provider("google", false));
    registry.register(throwingProvider("keycloak", error));

    // Assert
    expect(registry.getProviderStatuses()).toEqual([
      { id: "endatix", state: "active" },
      { id: "google", state: "invalid-config" },
      { id: "keycloak", state: "failed", error },
    ]);
  });

  it("logs nothing on registration, though the module loads again", async () => {
    // Arrange
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.resetModules();

    // Act
    await import("../auth-provider-registry");
    new AuthProviderRegistry().register(provider("google", false));

    // Assert
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe("logAuthProviders", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists each active provider on its own row under the title", () => {
    // Arrange
    const registry = new AuthProviderRegistry();
    registry.register(provider("endatix", true));
    registry.register(provider("keycloak", true));

    // Act
    logAuthProviders(registry);

    // Assert
    const rows = vi.mocked(console.info).mock.calls.map(([row]) => row);
    expect(rows).toEqual([
      expect.stringContaining("Auth providers:"),
      expect.stringMatching(/✓.* endatix$/),
      expect.stringMatching(/✓.* keycloak$/),
    ]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("crosses out a provider whose configuration is invalid", () => {
    // Arrange
    const registry = new AuthProviderRegistry();
    registry.register(provider("endatix", true));
    registry.register(provider("google", false));

    // Act
    logAuthProviders(registry);

    // Assert
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/✗.* google .*\(invalid configuration\)/),
    );
  });

  it("gives the error message for a provider that failed to register", () => {
    // Arrange
    const registry = new AuthProviderRegistry();
    const error = new Error("missing issuer");
    registry.register(throwingProvider("keycloak", error));

    // Act
    logAuthProviders(registry);

    // Assert
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /✗.* keycloak .*\(registration failed: missing issuer\)/,
      ),
    );
  });

  it("warns when no provider is active", () => {
    // Act
    logAuthProviders(new AuthProviderRegistry());

    // Assert
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Auth providers:.*\(none active\)/),
    );
  });
});
