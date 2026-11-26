import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import FolderPage from "@/app/(main)/forms/folders/[folderSlug]/page";

const { pathname, refresh } = vi.hoisted(() => ({
  pathname: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "session" }) }));
vi.mock("@/features/auth/authorization", async (original) => ({
  ...(await original<typeof import("@/features/auth/authorization")>()),
  authorization: async () => ({ requireHubAccess: async () => {} }),
}));
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  usePathname: pathname,
  useRouter: () => ({ refresh }),
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));

const folderPath = "/forms/folders/inbox";
const blocker = {
  key: "profile.review",
  scope: "user",
  severity: "blocking",
  canResolve: true,
  resolvePath: "/settings/security",
  resolverRoles: [],
  blockNonResolvers: false,
};

beforeEach(() => {
  vi.stubEnv("ENDATIX_BASE_URL", "https://api.example");
  pathname.mockReturnValue(folderPath);
});

async function openFolder(status: number, problem: object = {}) {
  vi.stubGlobal("fetch", async () =>
    Response.json({ status, ...problem }, { status }),
  );
  return FolderPage({ params: Promise.resolve({ folderSlug: "inbox" }) });
}

it.each([
  [401, "redirect:/signin"],
  [403, "redirect:/unauthorized"],
  [404, "not-found"],
])("keeps the folder's HTTP %i outcome distinct", async (status, outcome) => {
  await expect(openFolder(status)).rejects.toThrow(outcome);
});

it.each([
  [true, "/settings/security"],
  [false, "/required-actions"],
] as const)(
  "routes a typed folder refusal with canResolve=%s to %s",
  async (canResolve, target) => {
    // Arrange & Act
    const page = await openFolder(403, {
      errorCode: "required_action",
      requiredActions: [{ ...blocker, canResolve }],
    });

    // Assert
    expect(() => renderToStaticMarkup(page)).toThrow(`redirect:${target}`);
  },
);

it("offers account status instead of redirecting a refused resolver to itself", async () => {
  // Act
  render(
    await openFolder(403, {
      errorCode: "required_action",
      requiredActions: [{ ...blocker, resolvePath: folderPath }],
    }),
  );

  // Assert
  expect(
    screen
      .getByRole("link", { name: "View account status" })
      .getAttribute("href"),
  ).toBe("/required-actions");
});

it("lets the user retry a temporary folder failure on the same page", async () => {
  // Arrange
  render(
    await openFolder(503, {
      detail: "Account status is unavailable. Try again.",
    }),
  );
  expect(screen.getByRole("status").textContent).toContain(
    "Account status is unavailable.",
  );

  // Act & Assert
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("shows an ordinary API failure without offering account resolution", async () => {
  // Act
  render(await openFolder(500, { detail: "Could not load the folder." }));

  // Assert
  expect(screen.getByText("Could not load the folder.")).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
