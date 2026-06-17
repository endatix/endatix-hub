import { PlatformAdminsTable } from "@/features/platform-admin/list-platform-admins/ui/platform-admins-table";
import type {
  PagedResponse,
  PlatformAdminUserListItem,
} from "@/lib/endatix-api";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  it("does not render a revoke action for the current platform admin", () => {
    render(
      <PlatformAdminsTable
        admins={paged([
          user({
            id: "1514676504716378112",
            email: "current@endatix.com",
            authProvider: "Keycloak",
            isExternal: true,
          }),
          user({ id: "other-user", email: "other@endatix.com" }),
        ])}
        candidates={paged([])}
        currentUserId="1514676504716378112"
      />,
    );

    const currentUserRow = screen
      .getByText("current@endatix.com")
      .closest("tr");
    const otherUserRow = screen.getByText("other@endatix.com").closest("tr");

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
    expect(within(currentUserRow!).getByText("Local approval")).toBeDefined();
    expect(within(otherUserRow!).getByText("Local approval")).toBeDefined();
  });

  it("does not render a revoke action for the last platform admin", () => {
    render(
      <PlatformAdminsTable
        admins={paged([user({ email: "last@endatix.com" })])}
        candidates={paged([])}
        currentUserId="different-user"
      />,
    );

    const lastAdminRow = screen.getByText("last@endatix.com").closest("tr");

    expect(lastAdminRow).not.toBeNull();
    expect(
      within(lastAdminRow!).getByRole("button", { name: "Last admin" }),
    ).toHaveProperty("disabled", true);
    expect(
      within(lastAdminRow!).queryByRole("button", { name: "Revoke" }),
    ).toBeNull();
  });

  it("renders external platform admin nomination state for candidates", () => {
    render(
      <PlatformAdminsTable
        admins={paged([])}
        candidates={paged([
          user({
            id: "external-candidate",
            email: "external@endatix.com",
            authProvider: "Keycloak",
            isExternal: true,
            hasExternalPlatformAdminRole: true,
          }),
        ])}
      />,
    );

    const candidateRow = screen.getByText("external@endatix.com").closest("tr");

    expect(candidateRow).not.toBeNull();
    expect(
      screen.getByText(
        "External provider roles nominate users for platform administration. Local approval grants access in Endatix.",
      ),
    ).toBeDefined();
    expect(within(candidateRow!).getByText("Keycloak requested")).toBeDefined();
  });
});

function paged(
  items: PlatformAdminUserListItem[],
): PagedResponse<PlatformAdminUserListItem> {
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
    roles: ["PlatformAdmin"],
    ...overrides,
  };
}
