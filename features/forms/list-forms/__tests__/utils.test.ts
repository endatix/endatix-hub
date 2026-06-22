import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORMS_PAGE_SIZE,
  hasActiveFormsListFilters,
  hasActiveFormsListFiltersFromParams,
  isTenantWideFormsList,
  buildFolderContextById,
  parseFormsListParams,
  resolveFormsSearchPlaceholder,
  resolveRootFormsViewMode,
  shouldHideFolderShortcuts,
  shouldShowGlobalSearchAlert,
} from "../utils";

describe("parseFormsListParams", () => {
  it("defaults to unassigned scope with page size 25", () => {
    expect(parseFormsListParams(undefined, { kind: "root" })).toEqual({
      page: 1,
      pageSize: DEFAULT_FORMS_PAGE_SIZE,
      search: undefined,
      isEnabled: undefined,
      isPublic: undefined,
      unassignedOnly: true,
    });
  });

  it("returns tenant-wide list when browse=all", () => {
    expect(parseFormsListParams({ browse: "all" }, { kind: "root" })).toEqual({
      page: 1,
      pageSize: DEFAULT_FORMS_PAGE_SIZE,
      search: undefined,
      isEnabled: undefined,
      isPublic: undefined,
    });
  });

  it("normalizes invalid paging inputs to defaults", () => {
    expect(
      parseFormsListParams(
        { page: "0", pageSize: "-3", search: "demo" },
        { kind: "root" },
      ),
    ).toMatchObject({
      page: 1,
      pageSize: DEFAULT_FORMS_PAGE_SIZE,
      search: "demo",
    });

    expect(
      parseFormsListParams({ page: "2.9", pageSize: "12.4" }, { kind: "root" }),
    ).toMatchObject({
      page: 2,
      pageSize: 12,
    });
  });

  it("escalates to tenant-wide when filters are active on root", () => {
    expect(
      parseFormsListParams({ search: "survey" }, { kind: "root" }),
    ).toEqual({
      page: 1,
      pageSize: DEFAULT_FORMS_PAGE_SIZE,
      search: "survey",
      isEnabled: undefined,
      isPublic: undefined,
    });
  });

  it("parses search, status, visibility, and folder scope without escalation", () => {
    expect(
      parseFormsListParams(
        {
          page: "2",
          pageSize: "50",
          search: "  intake  ",
          status: "enabled",
          visibility: "private",
        },
        { kind: "folder", folderId: "42" },
      ),
    ).toEqual({
      page: 2,
      pageSize: 50,
      search: "intake",
      isEnabled: true,
      isPublic: false,
      folderId: "42",
    });
  });
});

describe("root view mode helpers", () => {
  it("resolves global-search when filters are active", () => {
    expect(resolveRootFormsViewMode({ search: "demo" })).toBe("global-search");
    expect(shouldHideFolderShortcuts({ search: "demo" })).toBe(true);
    expect(shouldShowGlobalSearchAlert({ search: "demo" })).toBe(true);
  });

  it("resolves all browse without hiding folders", () => {
    expect(resolveRootFormsViewMode({ browse: "all" })).toBe("all");
    expect(shouldHideFolderShortcuts({ browse: "all" })).toBe(false);
    expect(shouldShowGlobalSearchAlert({ browse: "all" })).toBe(false);
    expect(isTenantWideFormsList({ browse: "all" }, { kind: "root" })).toBe(
      true,
    );
  });

  it("defaults to unassigned browse", () => {
    expect(resolveRootFormsViewMode(undefined)).toBe("unassigned");
    expect(isTenantWideFormsList(undefined, { kind: "root" })).toBe(false);
  });
});

describe("resolveFormsSearchPlaceholder", () => {
  it("uses folder-scoped copy on folder pages", () => {
    expect(
      resolveFormsSearchPlaceholder({ variant: "folder", viewMode: null }),
    ).toBe("Search forms in this folder");
  });

  it("reflects root browse scope", () => {
    expect(
      resolveFormsSearchPlaceholder({
        variant: "root",
        viewMode: "unassigned",
      }),
    ).toBe("Search unassigned forms");
    expect(
      resolveFormsSearchPlaceholder({ variant: "root", viewMode: "all" }),
    ).toBe("Search all forms");
    expect(
      resolveFormsSearchPlaceholder({
        variant: "root",
        viewMode: "global-search",
      }),
    ).toBe("Search all forms");
  });
});

describe("buildFolderContextById", () => {
  it("maps folder metadata by id", () => {
    const contextById = buildFolderContextById([
      {
        id: "1",
        name: "Locked Folder",
        immutable: true,
        isActive: true,
      },
      {
        id: "2",
        name: "Draft Folder",
        immutable: false,
        isActive: false,
      },
    ]);

    expect(contextById.get("1")).toEqual({
      name: "Locked Folder",
      immutable: true,
      isActive: true,
    });
    expect(contextById.get("2")).toEqual({
      name: "Draft Folder",
      immutable: false,
      isActive: false,
    });
  });
});

describe("hasActiveFormsListFilters", () => {
  it("detects active filters from URL search params", () => {
    expect(
      hasActiveFormsListFilters(
        new URLSearchParams("search=survey&status=enabled"),
      ),
    ).toBe(true);
    expect(hasActiveFormsListFilters(new URLSearchParams())).toBe(false);
    expect(hasActiveFormsListFiltersFromParams({ status: "enabled" })).toBe(
      true,
    );
  });
});
