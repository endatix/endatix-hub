import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSidebarMainNav } from "@/components/layout-ui/sidebar/use-sidebar-main-nav";

const alpha = { id: "1", name: "Alpha", slug: "alpha" };
const beta = { id: "2", name: "Beta", slug: "beta" };

const keys = ["forms"];

function formsChildren(items: ReturnType<typeof useSidebarMainNav>): string[] {
  return (
    items
      .find((item) => item.key === "forms")
      ?.children?.map((child) => child.title) ?? []
  );
}

describe("useSidebarMainNav", () => {
  it("replaces folder links when props change, including an empty list", () => {
    const { result, rerender } = renderHook(
      ({ folders }: { folders: (typeof alpha)[] }) =>
        useSidebarMainNav(folders, keys, false),
      { initialProps: { folders: [alpha] } },
    );
    expect(formsChildren(result.current)).toEqual(["Alpha"]);

    rerender({ folders: [beta] });
    expect(formsChildren(result.current)).toEqual(["Beta"]);

    rerender({ folders: [] });
    expect(formsChildren(result.current)).toEqual([]);
  });

  it("drops folder links when the session ends and the nav slot has no folders", () => {
    const { result, rerender } = renderHook(
      ({
        folders,
        isAuthenticated,
      }: {
        folders: (typeof alpha)[] | undefined;
        isAuthenticated: boolean;
      }) => useSidebarMainNav(folders, keys, isAuthenticated),
      {
        initialProps: {
          folders: [alpha] as (typeof alpha)[] | undefined,
          isAuthenticated: true,
        },
      },
    );
    expect(formsChildren(result.current)).toEqual(["Alpha"]);

    rerender({ folders: undefined, isAuthenticated: false });
    expect(formsChildren(result.current)).not.toContain("Alpha");
  });
});
