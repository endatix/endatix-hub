import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoleListItem } from "@/lib/endatix-api";
import { UsersListToolbar } from "../users-list-toolbar";

vi.mock(
  "../../use-cases/create-tenant-user/ui/create-tenant-user-dialog",
  () => ({ CreateTenantUserDialog: () => <button>Invite User</button> }),
);

/** Below 768 px: the toolbar shows Filters, and ResponsivePanel is a Drawer. */
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

const ROLES: RoleListItem[] = [
  {
    id: 1,
    name: "Admin",
    isSystemDefined: true,
    isActive: true,
    permissions: [],
    usersCount: 1,
  },
];

async function renderToolbar(query: string, search = "") {
  const updateUrl = vi.fn();
  const setSearch = vi.fn();
  await act(async () => {
    render(
      <Suspense>
        <UsersListToolbar
          search={search}
          setSearch={setSearch}
          updateUrl={updateUrl}
          searchParams={new URLSearchParams(query)}
          availableRolesPromise={Promise.resolve(ROLES)}
          canInviteUsers
        />
      </Suspense>,
    );
  });
  return { updateUrl, setSearch };
}

describe("UsersListToolbar on a phone", () => {
  it("counts a role and a status on Filters", async () => {
    // Arrange & Act
    await renderToolbar("role=Admin&status=active");

    // Assert
    expect(screen.getByRole("button", { name: "Filters · 2" })).toBeTruthy();
  });

  it("labels the Role and Status selects in the Filters drawer", async () => {
    // Arrange
    await renderToolbar("status=locked");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));

    // Assert
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(within(drawer).getByLabelText("Role").textContent).toContain(
      "All roles",
    );
    expect(within(drawer).getByLabelText("Status").textContent).toContain(
      "Locked out",
    );
  });

  it("resets the search, the role and the status from the drawer", async () => {
    // Arrange
    const { updateUrl, setSearch } = await renderToolbar("role=Admin", "ada");
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));
    const drawer = screen.getByRole("dialog", { name: "Filters" });

    // Act
    fireEvent.click(within(drawer).getByRole("button", { name: "Reset" }));

    // Assert
    expect(setSearch).toHaveBeenCalledWith("");
    expect(updateUrl).toHaveBeenCalledWith({
      search: null,
      role: null,
      status: null,
      page: "1",
    });
  });
});
