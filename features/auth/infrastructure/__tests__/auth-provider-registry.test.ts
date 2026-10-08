import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProviderRegistry } from "../auth-provider-registry";
import type { IAuthProvider } from "../types";

vi.mock("../providers/endatix-auth-provider", () => ({
  EndatixAuthProvider: class {
    id = "endatix";
    validateConfig() {
      return false;
    }
  },
}));

const LOGGED_PROVIDERS = Symbol.for("endatix.auth.loggedProviders");

function provider(id: string, valid: boolean): IAuthProvider {
  return { id, validateConfig: () => valid } as unknown as IAuthProvider;
}

describe("AuthProviderRegistry status logging", () => {
  beforeEach(() => {
    delete (globalThis as Record<symbol, unknown>)[LOGGED_PROVIDERS];
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs an active provider once per process, though the module loads again", () => {
    // Arrange
    const first = new AuthProviderRegistry();
    const second = new AuthProviderRegistry();

    // Act
    first.register(provider("keycloak", true));
    second.register(provider("keycloak", true));

    // Assert
    expect(console.info).toHaveBeenCalledOnce();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Auth provider keycloak active"),
    );
  });

  it("logs nothing during next build", () => {
    // Arrange
    vi.stubEnv("NEXT_PHASE", "phase-production-build");

    // Act
    new AuthProviderRegistry().register(provider("keycloak", true));

    // Assert
    expect(console.info).not.toHaveBeenCalled();
  });

  it("warns once for a provider whose configuration is invalid", () => {
    // Act
    new AuthProviderRegistry().register(provider("google", false));
    new AuthProviderRegistry().register(provider("google", false));

    // Assert
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Auth provider google not activated"),
    );
  });
});
