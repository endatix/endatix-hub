import { beforeEach, expect, it, vi } from "vitest";
import WorkspaceStartPage from "@/app/workspace/start/page";
import { signinDestination } from "@/features/auth/use-cases/signin/signin-destination";

const { admission, flag, receipt } = vi.hoisted(() => ({
  admission: vi.fn(), flag: vi.fn(), receipt: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({}) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ requireHubAccess: async () => undefined }),
}));
vi.mock("@/features/auth/required-actions/workspace-redirect.server", () => ({ admitWorkspacePage: admission }));
vi.mock("@/lib/feature-flags/flags", () => ({ onboardingFlag: flag }));
vi.mock("@/features/onboarding/server", () => ({ canResumeWorkspaceSetup: receipt }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

beforeEach(() => {
  flag.mockResolvedValue(true);
});

it.each([[true, "/workspace/setup"], [false, "/forms"]])("lands according to unfinished enrollment (%s)", async (eligible, path) => {
  receipt.mockResolvedValue(eligible);
  await expect(WorkspaceStartPage()).rejects.toThrow(`redirect:${path}`);
});

it("leaves an owner on Forms while the rollout is paused", async () => {
  flag.mockResolvedValue(false);
  await expect(WorkspaceStartPage()).rejects.toThrow("redirect:/forms");
  expect(receipt).not.toHaveBeenCalled();
});

it("resolves ordinary admission and Terms before reading enrollment", async () => {
  admission.mockRejectedValueOnce(new Error("redirect:/accept-terms"));
  await expect(WorkspaceStartPage()).rejects.toThrow("redirect:/accept-terms");
  expect(receipt).not.toHaveBeenCalled();
});

it("distinguishes absent sign-in intent from an explicit Hub or Auth.js destination", () => {
  expect(signinDestination({})).toBeUndefined();
  expect(signinDestination({ returnUrl: "/forms", callbackUrl: "/settings/security" })).toBe("/forms");
  expect(signinDestination({ callbackUrl: "/settings/security" })).toBe("/settings/security");
  expect(signinDestination({ callbackUrl: "https://unknown.example/settings/security" })).toBe("/forms");
});
