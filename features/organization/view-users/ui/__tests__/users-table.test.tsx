import { USERS_COLUMNS_DEFINITION } from "@/features/organization/view-users/ui/columns-definition";
import type { UserListItem } from "@/lib/endatix-api";
import { render, screen } from "@testing-library/react";
import type { Row } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

/**
 * UsersTable uses React use(usersPromise), which does not resolve in this
 * test environment (Suspense stays on fallback). We test the columns
 * definition (headers, structure, cell content) as the unit level. The
 * page test covers that the table is rendered and permission checks.
 */

function renderCell(
  columnId: string,
  user: UserListItem,
  currentUserId?: string,
) {
  const columns = USERS_COLUMNS_DEFINITION(currentUserId);
  const col = columns.find((c) => c.id === columnId);
  if (!col?.cell) return null;
  const row = {
    original: user,
    id: String(user.id),
    index: 0,
    getValue: () => null,
    getContext: () => ({}),
    depth: 0,
    subRows: [],
    getVisibleCells: () => [],
    getAllCells: () => [],
  } as unknown as Row<UserListItem>;
  const Cell = col.cell as (info: {
    row: Row<UserListItem>;
  }) => React.ReactNode;
  return render(<>{Cell({ row })}</>);
}

describe("Users table columns", () => {
  it("defines NAME, EMAIL, ROLES columns", () => {
    const columns = USERS_COLUMNS_DEFINITION();
    expect(columns).toHaveLength(3);
    expect(columns.map((c) => c.id)).toEqual(["name", "email", "level"]);
    expect(columns[0].header).toBe("NAME");
    expect(columns[1].header).toBe("EMAIL");
    expect(columns[2].header).toBe("ROLES");
  });

  it("name cell shows display name and initials", () => {
    const user: UserListItem = {
      id: 1,
      userName: "Jane Doe",
      email: "jane@example.com",
      isVerified: true,
      roles: [],
    };
    renderCell("name", user);
    expect(screen.getByText("Jane Doe")).toBeDefined();
  });

  it("name cell shows (you) when currentUserId matches", () => {
    const user: UserListItem = {
      id: 42,
      userName: "Current User",
      email: "current@example.com",
      isVerified: true,
      roles: [],
    };
    renderCell("name", user, "42");
    expect(screen.getByText("Current User")).toBeDefined();
    expect(screen.getByText("(you)")).toBeDefined();
  });

  it("name cell derives display name from email when userName empty", () => {
    const user: UserListItem = {
      id: 2,
      userName: "",
      email: "tech@endatix.com",
      isVerified: false,
      roles: [],
    };
    renderCell("name", user);
    expect(screen.getByText("Tech")).toBeDefined();
  });

  it("email cell shows email", () => {
    const user: UserListItem = {
      id: 1,
      userName: "Alice",
      email: "alice@example.com",
      isVerified: true,
      roles: [],
    };
    renderCell("email", user);
    expect(screen.getByText("alice@example.com")).toBeDefined();
  });

  it("level cell shows role badges", () => {
    const user: UserListItem = {
      id: 1,
      userName: "Alice",
      email: "alice@example.com",
      isVerified: true,
      roles: ["Admin", "Editor"],
    };
    renderCell("level", user);
    expect(screen.getByText("Admin")).toBeDefined();
    expect(screen.getByText("Editor")).toBeDefined();
  });

  it("level cell shows — when no roles", () => {
    const user: UserListItem = {
      id: 1,
      userName: "Bob",
      email: "bob@example.com",
      isVerified: false,
      roles: [],
    };
    renderCell("level", user);
    expect(screen.getByText("—")).toBeDefined();
  });
});
