// @vitest-environment node

import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: mocks.getToken,
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

import { getAuthJwtFromRequest } from "../auth-jwt.utils";

describe("getAuthJwtFromRequest", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "auth-secret";
    vi.mocked(headers).mockResolvedValue(new Headers());
    vi.mocked(getToken).mockResolvedValue({
      provider: "keycloak",
      id_token: "id-token",
    } as JWT);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_SECRET;
  });

  it("reads the Auth.js JWT from the current request headers", async () => {
    const token = await getAuthJwtFromRequest();

    expect(getToken).toHaveBeenCalledWith({
      req: { headers: expect.any(Headers) },
      secret: "auth-secret",
    });
    expect(token).toEqual({
      provider: "keycloak",
      id_token: "id-token",
    });
  });

  it("returns null when there is no session JWT", async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    expect(await getAuthJwtFromRequest()).toBeNull();
  });
});
