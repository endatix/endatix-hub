import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import TermsPage from "@/app/(auth)/accept-terms/page";
import PrivacyPage from "@/app/(auth)/accept-terms/privacy/page";

const { enabled, me, publication } = vi.hoisted(() => ({
  enabled: vi.fn(),
  me: vi.fn(),
  publication: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "member" }) }));
vi.mock("@/features/auth/ui/auth-logo", () => ({ AuthLogo: () => null }));
vi.mock("@/features/legal/operator-contact", () => ({
  OperatorContact: () => null,
}));
vi.mock("@/features/legal/decline-terms.action", () => ({
  declineTerms: vi.fn(),
}));
vi.mock("@/features/legal/accept-terms.action", () => ({
  acceptTerms: vi.fn(),
}));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class {
    auth = { getAuthorizationData: me };
    get = publication;
  },
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  termsAcceptanceEnabled: enabled,
  formAnalyticsFlag: vi.fn(),
  personalizationFlag: vi.fn(),
  reportingExportFlag: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw Error(`redirect:${p}`);
  },
  notFound: () => {
    throw Error("not found");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
const personal = {
  key: "saas.legal.terms",
  scope: "user",
  severity: "blocking",
  resolvePath: "/accept-terms",
  canResolve: true,
  resolverRoles: [],
  blockNonResolvers: true,
};
const snapshot = (actions: object[]) => ({
  success: true,
  data: { userId: "42", tenantId: "1", roles: [], requiredActionsEnforced: true, requiredActions: actions },
});
const open = async () =>
  render(await TermsPage({ searchParams: Promise.resolve({}) }));
beforeEach(() => {
  vi.clearAllMocks();
  enabled.mockResolvedValue(true);
  me.mockResolvedValue(snapshot([personal]));
  publication.mockResolvedValue({
    success: true,
    data: {
      versionId: "9007199254740995",
      number: 3,
      markdown: "## Published conditions\n\nRead **this version**.",
    },
  });
});
it("renders the published Markdown, a separate Privacy notice, and explicit unchecked acceptance", async () => {
  await open();
  expect(
    screen.getByRole("heading", { name: "Published conditions" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /Privacy notice/ }).getAttribute("href"),
  ).toBe("/accept-terms/privacy");
  const box = screen.getByRole("checkbox", {
    name: /accept these Terms/,
  }) as HTMLInputElement;
  const button = screen.getByRole("button", {
    name: "Accept and continue",
  }) as HTMLButtonElement;
  expect(box.checked).toBe(false);
  expect(button.disabled).toBe(true);
  fireEvent.click(box);
  expect(button.disabled).toBe(false);
  expect(
    screen.getByRole("button", { name: "Decline and sign out" }),
  ).toBeTruthy();
});
it("shows retry instead of consent when the publication is missing or malformed", async () => {
  publication.mockResolvedValue({
    success: true,
    data: { versionId: 42, markdown: "unknown" },
  });
  await open();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  expect(screen.queryByRole("checkbox")).toBeNull();
});
it("redirects a non-resolver without reading the publication", async () => {
  me.mockResolvedValue(snapshot([{ ...personal, canResolve: false }]));
  await expect(open()).rejects.toThrow("redirect:/required-actions");
  expect(publication).not.toHaveBeenCalled();
});
it("renders only the published Privacy notice, with no acceptance", async () => {
  render(await PrivacyPage());
  expect(publication).toHaveBeenCalledWith("/public/legal/privacy", {
    requireAuth: false,
  });
  expect(screen.getByRole("heading", { name: "Privacy notice" })).toBeTruthy();
  expect(screen.queryByRole("checkbox")).toBeNull();
});
it("keeps both pages unavailable when the resolver flags are off", async () => {
  enabled.mockResolvedValue(false);
  await expect(open()).rejects.toThrow("redirect:/required-actions");
  await expect(PrivacyPage()).rejects.toThrow("not found");
  expect(publication).not.toHaveBeenCalled();
});
