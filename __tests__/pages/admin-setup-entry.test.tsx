// @vitest-environment node
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { canResumeWorkspaceSetup } from "@/features/onboarding/start-workspace/workspace-api.server";
import { listPlatformTenants, requirePlatformAdmin } from "@/features/platform-admin/server";
import Admin from "@/app/(main)/admin/page";
import AuthSettings from "@/app/(main)/admin/auth/page";
import EmailSettings from "@/app/(main)/admin/email/page";
import Environment from "@/app/(main)/admin/environment/page";
import Storage from "@/app/(main)/admin/storage/page";
import PlatformAdmins from "@/app/(main)/admin/platform-admins/page";
import SignupRequests from "@/app/(main)/admin/signup-requests/page";
import Tenants from "@/app/(main)/admin/tenants/page";

vi.mock("@/features/auth/required-actions/workspace-redirect.server", () => ({
  admitWorkspacePage: (guard: Promise<unknown>) => guard,
}));
vi.mock("@/features/platform-admin/server", () => ({
  requirePlatformAdmin: vi.fn(),
  getPlatformDashboard: vi.fn(),
  getAuthSettings: vi.fn(),
  getEmailSettings: vi.fn(),
  getEnvironmentSettings: vi.fn(),
  getStorageSettings: vi.fn(),
  listPlatformTenants: vi.fn(async () => Result.success({ items: [] })),
  listPlatformAdminUsers: async () => ({ items: [], totalRecords: 0 }),
}));
vi.mock("@/features/platform-admin/list-signup-requests/list-signup-requests.server", () => ({
  listSignupRequests: async () => Result.success({ items: [] }),
}));
vi.mock("@/features/platform-admin/review-signup-request/list-signup-reviewers.server", () => ({
  listSignupReviewers: async () => [],
}));
vi.mock("@/features/platform-admin/ui/platform-admin-shell", () => ({
  PlatformAdminShell: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/features/auth/authorization", async original => ({
  ...(await original<object>()),
  authorization: async () => ({ getAuthorizationData: async () => ({ success: false }) }),
}));
vi.mock("@/features/onboarding/start-workspace/workspace-api.server", () => ({
  canResumeWorkspaceSetup: vi.fn(async () => true),
}));
vi.mock("@/lib/branding/server", () => ({ getBrand: async () => ({ shortName: "Hub" }) }));
vi.mock("@/lib/feature-flags/flags", () => ({
  getAllFlags: async () => ({ saasManagement: true }),
  termsAcceptanceEnabled: async () => true,
  tenantManagementFlag: async () => true,
}));

beforeEach(() => {
  vi.mocked(requirePlatformAdmin).mockResolvedValue({ user: { id: "42" }, accessToken: "owner", expires: "later" });
});

it.each([
  ["Platform Admin", Admin], ["Auth Settings", AuthSettings], ["Email Settings", EmailSettings],
  ["Environment", Environment], ["Storage Settings", Storage], ["Platform Admins", PlatformAdmins],
  ["Signup Requests", SignupRequests], ["Tenants", Tenants],
] as const)("offers setup only after normal admission to %s", async (heading, page) => {
  vi.mocked(requirePlatformAdmin).mockRejectedValueOnce(new Error("Ordinary denial"));
  await expect(page({})).rejects.toThrow("Ordinary denial");
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();

  const stream = await renderToReadableStream(await page({}));
  const document = await new Response(stream).text();
  expect(document).toContain(`<h1>${heading}</h1>`);
  expect(document).toContain('href="/workspace/setup"');
  expect(canResumeWorkspaceSetup).toHaveBeenCalledOnce();
});

it("keeps setup on Platform Admins when only its optional tenant filter is unavailable", async () => {
  vi.mocked(listPlatformTenants).mockResolvedValueOnce(Result.error("Tenant filter unavailable"));
  const stream = await renderToReadableStream(await PlatformAdmins({}));
  const document = await new Response(stream).text();
  expect(document).toContain("<h1>Platform Admins</h1>");
  expect(document).toContain('href="/workspace/setup"');
});
