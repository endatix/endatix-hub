import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result/result";
import RequiredActionsPage from "@/app/(auth)/required-actions/page";

const { exitAction } = vi.hoisted(() => ({ exitAction: vi.fn() }));
vi.mock("@/auth", () => ({
  auth: async () => ({ accessToken: "session-token" }),
}));
vi.mock("@/features/platform-admin/assume-tenant/assume-tenant.action", () => ({
  exitAssumeAction: exitAction,
}));
vi.mock("@/features/auth/ui/auth-logo", () => ({ AuthLogo: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const blocker = {
  key: "saas.legal.return-home",
  scope: "tenant",
  severity: "blocking",
  resolverRoles: [],
  canResolve: false,
  resolvePath: "/required-actions",
  blockNonResolvers: true,
};

async function openStatus(response: Response) {
  vi.stubEnv("ENDATIX_BASE_URL", "https://api.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  render(await RequiredActionsPage());
}

it("offers the authorized return-home action, never a target-tenant Terms link", async () => {
  // Arrange
  const personal = {
    ...blocker,
    key: "profile.review",
    canResolve: true,
    resolvePath: "/settings/security",
  };
  exitAction.mockResolvedValue(Result.error("Forbidden"));
  await openStatus(Response.json({ requiredActions: [personal, blocker] }));
  expect(
    screen.getByText("Return to your home tenant to review your Terms."),
  ).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Review action" })).toBeNull();
  expect(exitAction).not.toHaveBeenCalled();

  // Act
  fireEvent.click(
    screen.getByRole("button", { name: "Return to home tenant" }),
  );

  // Assert
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(exitAction).toHaveBeenCalledTimes(1);
  expect(
    screen
      .getByRole("link", { name: "Sign out of support session" })
      .getAttribute("href"),
  ).toBe("/signout");
});

it("does not turn an ordinary non-resolver into support based on role", async () => {
  await openStatus(
    Response.json({
      roles: ["PlatformAdmin"],
      requiredActions: [{ ...blocker, key: "organization.review" }],
    }),
  );
  expect(screen.getByText(/organization’s admin must/i)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Return to home tenant" }),
  ).toBeNull();
});

it("keeps retry and sign-out available if the exit request is interrupted", async () => {
  exitAction.mockRejectedValueOnce(new Error("Network unavailable"));
  await openStatus(Response.json({ requiredActions: [blocker] }));
  fireEvent.click(
    screen.getByRole("button", { name: "Return to home tenant" }),
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Sign out of support session" }),
  ).toBeTruthy();
});

it("keeps unavailable status retryable", async () => {
  await openStatus(new Response(null, { status: 503 }));
  expect(
    screen.getByRole("heading", { name: "Account status is unavailable" }),
  ).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
