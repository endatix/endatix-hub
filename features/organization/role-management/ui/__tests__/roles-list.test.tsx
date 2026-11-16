import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PagedResponse, RoleListItem } from "@/lib/endatix-api";
import { stubPhoneWidth } from "@/test/stubs/phone-width";
import { RolesList } from "../roles-list";

const url = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));

vi.mock("@/components/table", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/table")>()),
  useListUrlState: () => ({
    search: "",
    setSearch: vi.fn(),
    updateUrl: vi.fn(),
    searchParams: url.searchParams,
    isPending: false,
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

const NO_ROLES: PagedResponse<RoleListItem> = {
  page: 1,
  pageSize: 10,
  totalPages: 0,
  totalRecords: 0,
  items: [],
};

async function renderRoles(query: string) {
  url.searchParams = new URLSearchParams(query);
  await act(async () => {
    render(
      <RolesList
        rolesPromise={Promise.resolve(NO_ROLES)}
        permissionsPromise={Promise.resolve([])}
        listKey="roles"
        canManageRoles={false}
      />,
    );
  });
}

describe("RolesList role type filter", () => {
  beforeEach(() => {
    stubPhoneWidth();
  });

  it.each(["SYSTEM", " custom "])(
    "reads ?roleType=%s as the page does: counted, with Reset",
    async (roleType) => {
      // Arrange & Act
      await renderRoles(`roleType=${encodeURIComponent(roleType)}`);

      // Assert
      expect(screen.getByRole("button", { name: "Filters · 1" })).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Reset Filters" }),
      ).toBeTruthy();
    },
  );

  it("treats an unknown role type as All types", async () => {
    // Arrange & Act
    await renderRoles("roleType=other");

    // Assert
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reset Filters" })).toBeNull();
  });
});
