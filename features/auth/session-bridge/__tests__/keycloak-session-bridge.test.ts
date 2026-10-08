// @vitest-environment node

import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionFromToken } from "../keycloak-session-bridge";
import type { KeycloakTokenResponse } from "../types";

vi.mock("next-auth/jwt", () => ({ encode: vi.fn() }));
vi.mock("@/auth", () => ({ authConfig: { secret: "auth-secret" } }));
vi.mock("../../authorization/application/authorization-data.provider", () => ({
  invalidateUserAuthorizationCache: vi.fn(),
}));

const SECURE = "__Secure-authjs.session-token";
const PLAIN = "authjs.session-token";

function unsignedJwt(payload: Record<string, unknown>): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none" })}.${part(payload)}.`;
}

const tokenData: KeycloakTokenResponse = {
  access_token: "access",
  refresh_token: "refresh",
  expires_in: 300,
  refresh_expires_in: 1800,
  id_token: unsignedJwt({ sub: "user-1", email: "a@example.com" }),
  token_type: "Bearer",
  scope: "openid",
  session_state: "state",
  issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
};

function bridgeRequest(forwardedProto: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/session-bridge", {
    method: "POST",
    headers: { "x-forwarded-proto": forwardedProto },
  });
}

describe("createSessionFromToken", () => {
  beforeEach(() => {
    vi.mocked(encode).mockResolvedValue("jwe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("writes the secure cookie when AUTH_URL is https behind an http proxy", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", "https://hub.example.com");

    // Act
    const response = await createSessionFromToken(
      tokenData,
      bridgeRequest("http"),
    );

    // Assert
    expect(response.cookies.get(SECURE)?.value).toBe("jwe");
    expect(encode).toHaveBeenCalledWith(
      expect.objectContaining({ salt: SECURE }),
    );
  });

  it("writes the plain cookie when AUTH_URL is http", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", "http://localhost:3000");

    // Act
    const response = await createSessionFromToken(
      tokenData,
      bridgeRequest("https"),
    );

    // Assert
    expect(response.cookies.get(PLAIN)?.value).toBe("jwe");
  });

  it.each([
    ["https", SECURE, true],
    ["http", PLAIN, false],
  ])(
    "follows x-forwarded-proto %s when no public URL is set",
    async (forwardedProto, cookieName, secure) => {
      // Arrange
      vi.stubEnv("AUTH_URL", undefined);

      // Act
      const response = await createSessionFromToken(
        tokenData,
        bridgeRequest(forwardedProto),
      );

      // Assert
      const cookie = response.cookies.get(cookieName);
      expect(cookie?.value).toBe("jwe");
      expect(cookie?.secure ?? false).toBe(secure);
    },
  );
});
