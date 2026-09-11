import { describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { loadThemeCatalogChoicePage } from "../load-theme-catalog-choice-page";

const { mockListPage } = vi.hoisted(() => ({
  mockListPage: vi.fn(),
}));

vi.mock("@/features/themes/list-themes", () => ({
  listThemesPageAction: (...args: unknown[]) => mockListPage(...args),
}));

function themePage(themes: Array<{ name: string; jsonData?: string }>) {
  return Result.success({
    page: 1,
    pageSize: 25,
    totalRecords: themes.length,
    totalPages: 1,
    hasNextPage: false,
    items: themes.map((theme, index) => ({
      id: `${index}`,
      name: theme.name,
      jsonData: theme.jsonData ?? JSON.stringify({ themeName: theme.name }),
      createdAt: new Date(),
    })),
  });
}

describe("loadThemeCatalogChoicePage", () => {
  it("pages Hub themes into Theme Editor choices and registers JSON", async () => {
    mockListPage.mockResolvedValue(themePage([{ name: "Brand" }]));
    const registerThemes = vi.fn();

    const page = await loadThemeCatalogChoicePage(0, 25, registerThemes);

    expect(mockListPage).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    expect(page).toEqual({
      hasNextPage: false,
      totalRecords: 2,
      items: [
        { value: "default", text: "Default" },
        { value: "Brand", text: "Brand" },
      ],
    });
    expect(registerThemes).toHaveBeenCalledWith([
      expect.objectContaining({ id: "0", themeName: "Brand" }),
    ]);
  });

  it("prepends Default on the first page only", async () => {
    mockListPage.mockResolvedValue(themePage([{ name: "Brand" }]));

    const page = await loadThemeCatalogChoicePage(25, 25, vi.fn());

    expect(mockListPage).toHaveBeenCalledWith({ page: 2, pageSize: 25 });
    expect(page.items).toEqual([{ value: "Brand", text: "Brand" }]);
  });

  it("skips themes with unusable JSON", async () => {
    mockListPage.mockResolvedValue(
      themePage([{ name: "Broken", jsonData: "{" }, { name: "Brand" }]),
    );
    const registerThemes = vi.fn();

    const page = await loadThemeCatalogChoicePage(0, 25, registerThemes);

    expect(page.items).toEqual([
      { value: "default", text: "Default" },
      { value: "Brand", text: "Brand" },
    ]);
    expect(registerThemes).toHaveBeenCalledWith([
      expect.objectContaining({ themeName: "Brand" }),
    ]);
  });

  it("returns Default only when the page request fails", async () => {
    mockListPage.mockResolvedValue(Result.error("Failed to fetch themes"));

    expect(await loadThemeCatalogChoicePage(0, 25, vi.fn())).toEqual({
      hasNextPage: false,
      totalRecords: 1,
      items: [{ value: "default", text: "Default" }],
    });
    expect(await loadThemeCatalogChoicePage(25, 25, vi.fn())).toEqual({
      hasNextPage: false,
      totalRecords: 0,
      items: [],
    });
  });
});
