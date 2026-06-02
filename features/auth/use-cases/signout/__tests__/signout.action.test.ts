// @vitest-environment node

import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { logoutAction } from "../signout.action";
import { signOut } from "@/auth";
import { getAuthJwtFromRequest } from "@/features/auth/infrastructure/auth-jwt.utils";
import { resolveFederatedLogoutUrl } from "@/features/auth/infrastructure/auth-logout.utils";
import { redirect } from "next/navigation";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  getAuthJwtFromRequest: vi.fn(),
  resolveFederatedLogoutUrl: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect to ${path}`);
  }),
}));

vi.mock("@/auth", () => ({
  signOut: mocks.signOut,
}));

vi.mock("@/features/auth/infrastructure/auth-jwt.utils", () => ({
  getAuthJwtFromRequest: mocks.getAuthJwtFromRequest,
}));

vi.mock("@/features/auth/infrastructure/auth-logout.utils", () => ({
  resolveFederatedLogoutUrl: mocks.resolveFederatedLogoutUrl,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("logoutAction", () => {
  const token = { provider: "keycloak", id_token: "id-token" } as JWT;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthJwtFromRequest).mockResolvedValue(token);
    vi.mocked(resolveFederatedLogoutUrl).mockReturnValue(null);
    vi.mocked(signOut).mockResolvedValue(undefined);
  });

  it("reads the JWT, resolves federated logout, clears the session, and redirects", async () => {
    const federatedLogoutUrl =
      "https://keycloak.endatix.test/realms/endatix/protocol/openid-connect/logout?id_token_hint=id-token";
    vi.mocked(resolveFederatedLogoutUrl).mockReturnValue(federatedLogoutUrl);

    await expect(logoutAction()).rejects.toThrow(
      `Redirect to ${federatedLogoutUrl}`,
    );

    expect(getAuthJwtFromRequest).toHaveBeenCalledOnce();
    expect(resolveFederatedLogoutUrl).toHaveBeenCalledWith(token);
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(redirect).toHaveBeenCalledWith(federatedLogoutUrl);
  });

  it("redirects to sign in when no federated logout URL is returned", async () => {
    await expect(logoutAction()).rejects.toThrow(`Redirect to ${SIGNIN_PATH}`);

    expect(getAuthJwtFromRequest).toHaveBeenCalledOnce();
    expect(resolveFederatedLogoutUrl).toHaveBeenCalledWith(token);
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(redirect).toHaveBeenCalledWith(SIGNIN_PATH);
  });
});
