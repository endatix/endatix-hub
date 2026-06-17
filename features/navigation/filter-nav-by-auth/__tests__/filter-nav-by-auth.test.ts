import { describe, expect, it } from "vitest";
import type { INavItem } from "@/types/navigation-models";
import { filterNavByAuth, filterNavByKeys } from "../filter-nav-by-auth";

const navItems: INavItem[] = [
  {
    key: "forms",
    title: "Forms",
    url: "/forms",
  },
  {
    key: "admin",
    title: "Platform Admin",
    url: "/admin",
    requiredRole: "PlatformAdmin",
    children: [
      {
        key: "adminHeader",
        title: "Configuration",
        url: "",
        isSectionHeader: true,
      },
      {
        key: "storage",
        title: "Storage",
        url: "/admin/storage",
        requiredRole: "PlatformAdmin",
      },
    ],
  },
];

describe("filterNavByAuth", () => {
  it("hides role-gated nav items when the user lacks the role", () => {
    const result = filterNavByAuth(navItems, {
      roles: ["User"],
      permissions: [],
      isAdmin: false,
    });

    expect(result.map((item) => item.key)).toEqual(["forms"]);
  });

  it("keeps role-gated nav items when the user has the role", () => {
    const result = filterNavByAuth(navItems, {
      roles: ["PlatformAdmin"],
      permissions: [],
      isAdmin: true,
    });

    expect(result.map((item) => item.key)).toEqual(["forms", "admin"]);
    expect(result[1]?.children?.map((item) => item.key)).toEqual([
      "adminHeader",
      "storage",
    ]);
  });

  it("does not grant role-gated items via isAdmin alone", () => {
    const result = filterNavByAuth(navItems, {
      roles: ["User"],
      permissions: [],
      isAdmin: true,
    });

    expect(result.map((item) => item.key)).toEqual(["forms"]);
  });

  it("hides permission-gated items without permission", () => {
    const items: INavItem[] = [
      {
        key: "reports",
        title: "Reports",
        url: "/reports",
        requiredPermission: "reports.read",
      },
    ];

    const result = filterNavByAuth(items, {
      roles: [],
      permissions: [],
      isAdmin: false,
    });

    expect(result).toEqual([]);
  });

  it("allows permission-gated items for tenant admins via isAdmin", () => {
    const items: INavItem[] = [
      {
        key: "reports",
        title: "Reports",
        url: "/reports",
        requiredPermission: "reports.read",
      },
    ];

    const result = filterNavByAuth(items, {
      roles: [],
      permissions: [],
      isAdmin: true,
    });

    expect(result.map((item) => item.key)).toEqual(["reports"]);
  });
});

describe("filterNavByKeys", () => {
  it("fails closed when keys are missing", () => {
    const result = filterNavByKeys(navItems, undefined);

    expect(result.map((item) => item.key)).toEqual(["forms"]);
  });

  it("keeps only items present in the key set", () => {
    const result = filterNavByKeys(navItems, [
      "forms",
      "admin",
      "adminHeader",
      "storage",
    ]);

    expect(result.map((item) => item.key)).toEqual(["forms", "admin"]);
    expect(result[1]?.children?.map((item) => item.key)).toEqual([
      "adminHeader",
      "storage",
    ]);
  });
});
