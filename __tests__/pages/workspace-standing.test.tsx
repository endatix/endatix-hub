import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import Template from "@/app/(main)/template";

const { snapshot, pathname } = vi.hoisted(() => ({
  snapshot: vi.fn(),
  pathname: vi.fn(() => "/forms"),
}));
vi.mock("@/auth", () => ({ auth: async () => ({}) }));
vi.mock(
  "@/features/auth/authorization/application/authorization-data.provider",
  () => ({
    getAuthDataForCurrentUser: () => snapshot,
  }),
);
vi.mock("next/navigation", () => ({
  usePathname: pathname,
  redirect: (href: string) => {
    throw new Error(`navigate:${href}`);
  },
}));

const action = {
  key: "profile",
  scope: "user",
  severity: "blocking",
  resolverRoles: [],
  canResolve: true,
  resolvePath: "/settings/security",
  blockNonResolvers: false,
};
const renderWorkspace = async () =>
  renderToStaticMarkup(await Template({ children: <p>Workspace</p> }));

it.each([undefined, false, "true"])(
  "leaves a blocker dormant for mode %s",
  async (mode) => {
    snapshot.mockResolvedValue({
      success: true,
      data: { requiredActionsEnforced: mode, requiredActions: [action] },
    });
    expect(await renderWorkspace()).toContain("Workspace");
  },
);

it.each([
  [true, "/settings/security"],
  [false, "/required-actions"],
])(
  "routes an enforced blocker with canResolve=%s",
  async (canResolve, target) => {
    snapshot.mockResolvedValue({
      success: true,
      data: {
        requiredActionsEnforced: true,
        requiredActions: [{ ...action, canResolve }],
      },
    });
    await expect(renderWorkspace()).rejects.toThrow(`navigate:${target}`);
  },
);

it("renders the resolver itself without redirecting", async () => {
  pathname.mockReturnValueOnce("/settings/security");
  snapshot.mockResolvedValue({
    success: true,
    data: { requiredActionsEnforced: true, requiredActions: [action] },
  });
  expect(await renderWorkspace()).toContain("Workspace");
});

it.each([
  { success: false },
  {
    success: true,
    data: { requiredActionsEnforced: true, requiredActions: [] },
  },
  {
    success: true,
    data: {
      requiredActionsEnforced: true,
      requiredActions: [{ ...action, severity: "notice" }],
    },
  },
])(
  "does not turn a failure or a non-blocking snapshot into a redirect",
  async (result) => {
    snapshot.mockResolvedValue(result);
    expect(await renderWorkspace()).toContain("Workspace");
  },
);
