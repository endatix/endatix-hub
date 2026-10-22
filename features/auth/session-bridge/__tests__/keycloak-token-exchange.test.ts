import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeKeycloakToken } from "../keycloak-token-exchange";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("exchangeKeycloakToken", () => {
  it("reports an unknown error when fetch rejects without a reason", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(undefined));

    const result = await exchangeKeycloakToken("mobile-jwt");

    expect(result.success).toBe(false);
    expect(!result.success && result.error.details).toEqual({
      details: "Unknown error",
    });
  });

  it("reports the error message when fetch throws an Error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    const result = await exchangeKeycloakToken("mobile-jwt");

    expect(!result.success && result.error.details).toEqual({
      details: "boom",
    });
  });
});
