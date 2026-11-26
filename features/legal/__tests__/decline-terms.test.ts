import { beforeEach, expect, it, vi } from "vitest";
import { declineTerms } from "../decline-terms.action";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";

const { set, logout, enabled } = vi.hoisted(() => ({
  set: vi.fn(),
  logout: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("@/features/auth/server", () => ({ logoutAction: logout }));
vi.mock("../terms-standing.server", () => ({
  signedInToken: async () => "current",
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  termsAcceptanceEnabled: enabled,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Error(url);
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  enabled.mockResolvedValue(true);
});
it("signs out and leaves the sign-in page a short-lived decline notice", async () => {
  await declineTerms(workspaceScope("current"));
  expect(logout).toHaveBeenCalledOnce();
  expect(set).toHaveBeenCalledWith(
    "terms-declined",
    "1",
    expect.objectContaining({ httpOnly: true, path: "/signin" }),
  );
});
it("does not sign a replacement session out from an old Terms tab", async () => {
  await expect(declineTerms(workspaceScope("previous"))).rejects.toThrow(
    "/accept-terms",
  );
  expect(logout).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
});
it("returns to the ordinary sign-out choice when Terms are disabled", async () => {
  enabled.mockResolvedValue(false);
  await expect(declineTerms(workspaceScope("current"))).rejects.toThrow(
    "/signout",
  );
  expect(logout).not.toHaveBeenCalled();
});
