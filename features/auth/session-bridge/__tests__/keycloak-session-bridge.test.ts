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
const CHUNK_SIZE = 4096 - 160;

function unsignedJwt(payload: Record<string, unknown>): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none" })}.${part(payload)}.`;
}

const idToken = unsignedJwt({ sub: "user-1", email: "a@example.com" });
const tokenData: KeycloakTokenResponse = {
  access_token: "access",
  refresh_token: "refresh",
  expires_in: 300,
  refresh_expires_in: 1800,
  id_token: idToken,
  token_type: "Bearer",
  scope: "openid",
  session_state: "state",
  issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
};

function bridgeRequest(cookie?: string): NextRequest {
  const headers = new Headers({ "x-forwarded-proto": "https" });
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return new NextRequest("http://localhost:3000/api/session-bridge", {
    method: "POST",
    headers,
  });
}

describe("createSessionFromToken", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_URL", "https://hub.example.com");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.mocked(encode).mockResolvedValue("jwe");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("keeps the id_token and stores expires_at in epoch seconds", async () => {
    // Act
    await createSessionFromToken(tokenData, bridgeRequest());

    // Assert
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(encode).toHaveBeenCalledWith(
      expect.objectContaining({
        salt: SECURE,
        token: expect.objectContaining({
          id_token: idToken,
          iat: nowSeconds,
          expires_at: nowSeconds + 300,
        }),
      }),
    );
  });

  it("writes one cookie when the token fits", async () => {
    // Act
    const response = await createSessionFromToken(tokenData, bridgeRequest());

    // Assert
    expect(response.cookies.get(SECURE)?.value).toBe("jwe");
  });

  it("splits a large token into Auth.js chunks and expires stale ones", async () => {
    // Arrange
    const large = "x".repeat(CHUNK_SIZE + 10);
    vi.mocked(encode).mockResolvedValue(large);
    const request = bridgeRequest(`${SECURE}=old; ${SECURE}.2=old; other=1`);

    // Act
    const response = await createSessionFromToken(tokenData, request);

    // Assert
    expect(response.cookies.get(`${SECURE}.0`)?.value).toHaveLength(CHUNK_SIZE);
    expect(response.cookies.get(`${SECURE}.1`)?.value).toHaveLength(10);
    expect(response.cookies.get(SECURE)?.maxAge).toBe(0);
    expect(response.cookies.get(`${SECURE}.2`)?.maxAge).toBe(0);
    expect(response.cookies.get("other")).toBeUndefined();
  });
});
