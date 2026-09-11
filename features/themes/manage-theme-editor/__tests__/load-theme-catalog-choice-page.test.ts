import { describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { loadThemeCatalogChoicePage } from "../load-theme-catalog-choice-page";

const { mockListPage } = vi.hoisted(() => ({
  mockListPage: vi.fn(),
}));

vi.mock("@/features/themes/list-themes", () => ({
  listThemesPageAction: (...args: unknown[]) => mockListPage(...args),
}));

describe("loadThemeCatalogChoicePage", () => {
  it("pages Hub themes into Theme Editor choices and registers JSON", async () => {
    mockListPage.mockResolvedValue(
      Result.success({
        page: 1,
        pageSize: 25,
        totalRecords: 1,
        totalPages: 1,
        hasNextPage: false,
        items: [
          {
            id: "9",
            name: "Brand",
            jsonData: '{"themeName":"Brand"}',
            createdAt: new Date(),
          },
        ],
      }),
    );
    const registerThemes = vi.fn();

    const page = await loadThemeCatalogChoicePage(0, 25, undefined, registerThemes);

    expect(mockListPage).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    expect(page.items).toEqual([
      { value: "default", text: "Default" },
      { value: "Brand", text: "Brand" },
    ]);
    expect(registerThemes).toHaveBeenCalledWith([
      expect.objectContaining({ id: "9", themeName: "Brand" }),
    ]);
    expect(page.total).toBeGreaterThanOrEqual(2);
  });

  it("returns Default only when the page request fails", async () => {
    mockListPage.mockResolvedValue(Result.error("Failed to fetch themes"));

    const page = await loadThemeCatalogChoicePage(0, 25, undefined, vi.fn());

    expect(page.items).toEqual([{ value: "default", text: "Default" }]);
    expect(page.total).toBe(1);
  });
});
