import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { signIn } from "next-auth/react";
import SignInPage from "@/app/(auth)/signin/page";
import TenantSignInPage from "@/app/(auth)/t/[tenantSlug]/signin/page";
import { renderWithBrand } from "@/test/render-with-brand";
import { Result } from "@/lib/result";

vi.mock("@/auth", () => ({
  auth: async () => null,
  authPresentation: [
    { id: "endatix", name: "Password", type: "credentials" },
    { id: "organization", name: "Organization", type: "oidc", signInLabel: "Organization sign-in" },
  ],
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("@/features/auth/use-cases/signin/sign-in-with-endatix.action", () => ({ signInWithEndatixAction: vi.fn() }));
vi.mock("@/features/legal/operator-contact", () => ({ DeclinedNotice: () => null }));
vi.mock("@/features/tenants/public-tenant/public-tenant.action", () => ({
  getPublicTenantAction: async () => Result.success({ name: "Organization", allowedAuthProviders: ["organization"] }),
}));

const path = "/settings/security?tab=security#sessions";
const tenant = { params: Promise.resolve({ tenantSlug: "test1234" }) };

for (const page of [SignInPage, TenantSignInPage]) {
  it.each([
    [undefined, window.location.origin, path],
    [undefined, "https://other.example", "/forms"],
    ["https://hub.example", "https://hub.example", path],
    ["https://hub.example", window.location.origin, "/forms"],
    ["invalid", window.location.origin, "/forms"],
  ])(`${page.name} checks callback origin (AUTH_URL=%s, callback=%s)`, async (authUrl, callbackOrigin, destination) => {
    vi.stubEnv("AUTH_URL", authUrl);
    const searchParams = Promise.resolve({ callbackUrl: callbackOrigin + path, returnUrl: undefined });
    const { container } = renderWithBrand(await page({ ...tenant, searchParams }));
    expect(new FormData(container.querySelector("form")!).get("returnUrl")).toBe(destination);
    fireEvent.click(screen.getByRole("button", { name: "Organization sign-in" }));
    expect(signIn).toHaveBeenCalledWith("organization", { redirectTo: destination });
  });
}
