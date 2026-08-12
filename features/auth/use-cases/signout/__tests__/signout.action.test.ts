import { describe, it, expect, vi, beforeEach } from "vitest";
import { SIGNIN_PATH } from "../../../infrastructure/auth-constants";

const mockRedirect = vi.fn();
const mockSignOut = vi.fn();
const mockGetAuthJwtFromRequest = vi.fn();
const mockResolveFederatedLogoutUrl = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`Redirect to ${path}`);
  },
}));

vi.mock("@/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("../../../infrastructure/auth-jwt.utils", () => ({
  getAuthJwtFromRequest: () => mockGetAuthJwtFromRequest(),
}));

vi.mock("../../../infrastructure/auth-logout.utils", () => ({
  resolveFederatedLogoutUrl: (...args: unknown[]) =>
    mockResolveFederatedLogoutUrl(...args),
}));

describe("logoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/app");
    mockSignOut.mockResolvedValue(undefined);
    mockGetAuthJwtFromRequest.mockResolvedValue(null);
    mockResolveFederatedLogoutUrl.mockReturnValue(null);
  });

  it("should redirect to signin without manually prefixing basePath", async () => {
    const { logoutAction } = await import("../signout.action");

    await expect(logoutAction()).rejects.toThrow(`Redirect to ${SIGNIN_PATH}`);

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockRedirect).toHaveBeenCalledWith(SIGNIN_PATH);
    expect(mockRedirect).not.toHaveBeenCalledWith("/app/signin");
  });

  it("should redirect to federated logout URL when available", async () => {
    const federatedLogoutUrl = "https://idp.example.com/logout";
    mockResolveFederatedLogoutUrl.mockReturnValue(federatedLogoutUrl);

    const { logoutAction } = await import("../signout.action");

    await expect(logoutAction()).rejects.toThrow(
      `Redirect to ${federatedLogoutUrl}`,
    );

    expect(mockRedirect).toHaveBeenCalledWith(federatedLogoutUrl);
    expect(mockRedirect).not.toHaveBeenCalledWith(SIGNIN_PATH);
  });
});
