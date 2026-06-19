import { PlatformAdminsTable } from "@/features/platform-admin/list-platform-admins/ui/platform-admins-table";
import type {
  PagedResponse,
  PlatformAdminUserListItem,
} from "@/lib/endatix-api";
import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/platform-admins",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({
    trackEvent: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock(
  "@/features/platform-admin/grant-platform-admin/grant-platform-admin.action",
  () => ({
    grantPlatformAdminAction: vi.fn(),
  }),
);

vi.mock(
  "@/features/platform-admin/revoke-platform-admin/revoke-platform-admin.action",
  () => ({
    revokePlatformAdminAction: vi.fn(),
  }),
);

describe("PlatformAdminsTable", () => {
  it("does not render a revoke action for the current platform admin", async () => {
    await act(async () => {
      render(
        <PlatformAdminsTable
          usersPromise={Promise.resolve(
            paged([
              user({
                id: "1514676504716378112",
                email: "current@endatix.com",
                authProvider: "Keycloak",
                isExternal: true,
                roles: ["PlatformAdmin"],
              }),
              user({
                id: "other-user",
                email: "other@endatix.com",
                roles: ["PlatformAdmin"],
              }),
            ]),
          )}
          tenantsPromise={Promise.resolve(paged([]))}
          approvedAdminTotalPromise={Promise.resolve(2)}
          currentUserId="1514676504716378112"
        />,
      );
    });

    const currentUserRow = (
      await screen.findByText("current@endatix.com")
    ).closest("tr");
    const otherUserRow = (await screen.findByText("other@endatix.com")).closest(
      "tr",
    );

    expect(currentUserRow).not.toBeNull();
    expect(otherUserRow).not.toBeNull();
    expect(
      within(currentUserRow!).getByRole("button", { name: "Current user" }),
    ).toHaveProperty("disabled", true);
    expect(
      within(currentUserRow!).queryByRole("button", { name: "Revoke" }),
    ).toBeNull();
    expect(
      within(otherUserRow!).getByRole("button", { name: "Revoke" }),
    ).toBeDefined();
  });

  it("does not render a revoke action for the last approved platform admin", async () => {
    await act(async () => {
      render(
        <PlatformAdminsTable
          usersPromise={Promise.resolve(
            paged([
              user({
                email: "last@endatix.com",
                roles: ["PlatformAdmin"],
              }),
            ]),
          )}
          tenantsPromise={Promise.resolve(paged([]))}
          approvedAdminTotalPromise={Promise.resolve(1)}
          currentUserId="different-user"
        />,
      );
    });

    const lastAdminRow = (await screen.findByText("last@endatix.com")).closest(
      "tr",
    );

    expect(lastAdminRow).not.toBeNull();
    expect(
      within(lastAdminRow!).getByRole("button", { name: "Last admin" }),
    ).toHaveProperty("disabled", true);
  });

  it("renders grant action and external nomination badge for candidates", async () => {
    await act(async () => {
      render(
        <PlatformAdminsTable
          usersPromise={Promise.resolve(
            paged([
              user({
                id: "external-candidate",
                email: "external@endatix.com",
                authProvider: "Keycloak",
                isExternal: true,
                hasExternalPlatformAdminRole: true,
                roles: [],
              }),
            ]),
          )}
          tenantsPromise={Promise.resolve(paged([]))}
          approvedAdminTotalPromise={Promise.resolve(0)}
        />,
      );
    });

    const candidateRow = (
      await screen.findByText("external@endatix.com")
    ).closest("tr");

    expect(candidateRow).not.toBeNull();
    expect(
      within(candidateRow!).getByRole("button", { name: "Grant" }),
    ).toBeDefined();
    expect(within(candidateRow!).getByText("Keycloak requested")).toBeDefined();
  });
});

function paged<T>(items: T[]): PagedResponse<T> {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: items.length,
  };
}

function user(
  overrides: Partial<PlatformAdminUserListItem>,
): PlatformAdminUserListItem {
  return {
    id: "user-1",
    tenantId: "1",
    tenantName: "Default Tenant",
    userName: "user@endatix.com",
    email: "user@endatix.com",
    displayName: null,
    authProvider: "Endatix",
    isExternal: false,
    isVerified: true,
    isLockedOut: false,
    lastLoginAt: null,
    hasExternalPlatformAdminRole: false,
    roles: [],
    ...overrides,
  };
}
