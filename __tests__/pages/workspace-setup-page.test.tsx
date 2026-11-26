import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import WorkspaceSetupPage from "@/app/workspace/setup/page";
import { WorkspaceStartSection } from "@/features/onboarding/start-workspace/workspace-start-section";
import { renderWithBrand } from "@/test/render-with-brand";

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "owner" }) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ requireHubAccess: async () => undefined }),
}));
vi.mock("@/features/auth/required-actions/workspace-redirect.server", () => ({
  admitWorkspacePage: (guard: Promise<void>) => guard,
}));
vi.mock("@/features/onboarding/start-workspace/workspace-start-section", () => ({ WorkspaceStartSection: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

it("keeps the setup choice on its own page with an ordinary exit", async () => {
  vi.mocked(WorkspaceStartSection).mockResolvedValue(<section aria-label="Workspace choice" />);
  renderWithBrand(await WorkspaceSetupPage());
  expect(screen.getByRole("region", { name: "Workspace choice" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Go to my workspace" }).getAttribute("href")).toBe("/forms");
  expect(screen.queryByRole("complementary", { name: "Personal help" })).toBeNull();
});

it("sends a direct visitor without a workspace receipt to ordinary Forms", async () => {
  vi.mocked(WorkspaceStartSection).mockResolvedValue(null);
  await expect(WorkspaceSetupPage()).rejects.toThrow("redirect:/forms");
});
