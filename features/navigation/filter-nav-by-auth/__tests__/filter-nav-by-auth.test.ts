import { describe, expect, it } from "vitest";
import type { INavItem } from "@/types/navigation-models";
import { filterNavByAuth } from "../filter-nav-by-auth";

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
});
