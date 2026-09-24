import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolesList } from "@/features/organization/role-management/ui/roles-list";
import { UsersList } from "@/features/organization/user-management/ui/users-list";
import { PlatformAdminsList } from "@/features/platform-admin/list-platform-admins/ui/platform-admins-list";
import { TenantsList } from "@/features/platform-admin/list-tenants/ui/tenants-list";
import { Result } from "@/lib/result";

type PlatformAdminsListProps = Parameters<typeof PlatformAdminsList>[0];

const pageLabel = vi.hoisted(() => ({ current: "page-1 rows" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/list",
  useSearchParams: () => new URLSearchParams(),
}));

/** Latches the first label, so new rows show only if the frame remounts. */
function LatchedRows() {
  const [seen] = useState(pageLabel.current);
  return <p>{seen}</p>;
}

vi.mock("@/features/organization/user-management/ui/users-table", () => ({
  UsersTable: LatchedRows,
}));
vi.mock("@/features/organization/role-management/ui/roles-table", () => ({
  RolesTable: LatchedRows,
}));
vi.mock(
  "@/features/platform-admin/list-platform-admins/ui/platform-admins-table",
  () => ({ PlatformAdminsTable: LatchedRows }),
);
vi.mock("@/features/platform-admin/list-tenants/ui/tenants-table", () => ({
  TenantsTableFromPromise: LatchedRows,
}));
vi.mock(
  "@/features/organization/user-management/use-cases/create-tenant-user/ui/create-tenant-user-dialog",
  () => ({ CreateTenantUserDialog: () => <button>Invite User</button> }),
);

const never = new Promise<never>(() => {});
const noRoles = Promise.resolve([]);
const noTenants = Promise.resolve(
  Result.success({ items: [] }),
) as unknown as PlatformAdminsListProps["tenantsPromise"];

const shells = [
  {
    name: "TenantsList",
    searchLabel: "Search tenants",
    render: (listKey: string) => (
      <TenantsList tenantsPromise={never} listKey={listKey} />
    ),
  },
  {
    name: "UsersList",
    searchLabel: "Search organization users by name or email",
    render: (listKey: string) => (
      <UsersList
        usersPromise={never}
        listKey={listKey}
        availableRolesPromise={noRoles}
      />
    ),
  },
  {
    name: "RolesList",
    searchLabel: "Search organization roles by name",
    render: (listKey: string) => (
      <RolesList
        rolesPromise={never}
        permissionsPromise={never}
        listKey={listKey}
        canManageRoles={false}
      />
    ),
  },
  {
    name: "PlatformAdminsList",
    searchLabel: "Search platform administrators by name or email",
    render: (listKey: string) => (
      <PlatformAdminsList
        usersPromise={never}
        tenantsPromise={noTenants}
        approvedAdminTotalPromise={never}
        listKey={listKey}
      />
    ),
  },
];

describe.each(shells)("$name", ({ searchLabel, render: renderShell }) => {
  beforeEach(() => {
    pageLabel.current = "page-1 rows";
  });

  it("shows the next page when listKey changes and keeps the search input mounted", async () => {
    const view = await act(async () => render(renderShell("page-1")));
    const input = screen.getByLabelText(searchLabel);
    input.focus();
    fireEvent.change(input, { target: { value: "ada" } });
    expect(screen.getByText("page-1 rows")).toBeTruthy();

    pageLabel.current = "page-2 rows";
    await act(async () => view.rerender(renderShell("page-2")));

    expect(screen.getByText("page-2 rows")).toBeTruthy();
    expect(screen.queryByText("page-1 rows")).toBeNull();
    expect(screen.getByLabelText(searchLabel)).toBe(input);
    expect((input as HTMLInputElement).value).toBe("ada");
    expect(document.activeElement).toBe(input);
  });
});
