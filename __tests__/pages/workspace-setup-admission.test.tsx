// @vitest-environment node
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { expect, it, vi } from "vitest";
import DefaultNav from "@/app/(main)/@nav/default";
import FormsNav from "@/app/(main)/@nav/page";
import OrganizationForms from "@/app/(main)/settings/organization/forms/page";
import { canResumeWorkspaceSetup } from "@/features/onboarding/start-workspace/workspace-api.server";
import { withWorkspaceSetupAfter } from "@/features/onboarding/server";

const manageSettings = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "owner" }) }));
vi.mock("@/features/auth/authorization", async (original) => ({
  ...(await original<object>()),
  authorization: async () => ({ requireHubAccess: vi.fn(), checkPermission: manageSettings }),
}));
vi.mock("@/features/auth/required-actions/workspace-redirect.server", () => ({
  workspaceSlot: (render: () => ReactNode) => render,
  resolveWorkspaceAction: vi.fn(),
}));
vi.mock("@/features/onboarding/start-workspace/workspace-api.server", () => ({
  canResumeWorkspaceSetup: vi.fn(async () => true),
}));
vi.mock("@/features/navigation/filter-nav-by-auth/server", () => ({ getAuthorizedNavItemKeys: async () => [] }));
vi.mock("@/features/folders/view-forms-header", () => ({ getFormsHeaderDataCached: async () => ({}) }));
vi.mock("@/components/layout-ui/sidebar/sidebar-nav", () => ({
  default: ({ children }: { children?: ReactNode }) => <nav>{children}</nav>,
}));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class { tenant = { getSettings: async () => ({ success: true, data: {} }) }; },
}));
vi.mock("@/features/settings/ui/organization-forms-settings-form", () => ({
  OrganizationFormsSettingsForm: () => <div>Admitted settings</div>,
}));

async function html(content: ReactNode) {
  const stream = await renderToReadableStream(content);
  return new Response(stream).text();
}

it.each([DefaultNav, FormsNav])("never starts an owner receipt read in parallel with inline page denial", async (nav) => {
  manageSettings.mockResolvedValue({ success: false });
  const [navigation, page] = await Promise.all([nav(), OrganizationForms()]);
  const document = await html(<>{navigation}{page}</>);
  expect(document).toContain("You do not have permission to view this page.");
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();
  expect(document).not.toContain("/forms#workspace-setup");
});

it("offers the owner setup on the admitted settings destination", async () => {
  manageSettings.mockResolvedValue({ success: true });
  const document = await html(await OrganizationForms());
  expect(document).toContain("Admitted settings");
  expect(document).toContain("/forms#workspace-setup");
  expect(canResumeWorkspaceSetup).toHaveBeenCalledOnce();
});

it("does not start setup when the streamed page data refuses access", async () => {
  const document = await html(withWorkspaceSetupAfter(Promise.resolve(false), <p>Access denied</p>));
  expect(document).toContain("Access denied");
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();
});

it("leaves the page's own load error in place when its data rejects", async () => {
  const document = await html(withWorkspaceSetupAfter(Promise.reject(new Error("Unavailable")), <p>Try again</p>));
  expect(document).toContain("Try again");
  expect(canResumeWorkspaceSetup).not.toHaveBeenCalled();
});

it("leaves an admitted teammate on the original page without an owner link", async () => {
  vi.mocked(canResumeWorkspaceSetup).mockResolvedValueOnce(false);
  const document = await html(withWorkspaceSetupAfter(Promise.resolve(true), <p>Workspace content</p>));
  expect(document).toContain("Workspace content");
  expect(document).not.toContain("/forms#workspace-setup");
});
