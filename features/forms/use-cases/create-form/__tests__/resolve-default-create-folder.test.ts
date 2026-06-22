import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCreateFormHref,
  getSelectableCreateFolders,
  parseFormsFolderSlugFromPathname,
  resolveDefaultCreateFolder,
  resolveEffectiveCreateFolderId,
} from "../resolve-default-create-folder";

const folders = [
  {
    id: "1",
    name: "Locked Folder",
    slug: "locked-folder",
    isActive: true,
    immutable: true,
  },
  {
    id: "2",
    name: "Draft Folder",
    slug: "draft-folder",
    isActive: false,
    immutable: false,
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseFormsFolderSlugFromPathname", () => {
  it("extracts slug from folder routes", () => {
    expect(
      parseFormsFolderSlugFromPathname("/forms/folders/locked-folder"),
    ).toBe("locked-folder");
    expect(
      parseFormsFolderSlugFromPathname("/forms/folders/locked-folder/forms"),
    ).toBe("locked-folder");
  });

  it("strips base path before matching", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/hub");

    expect(
      parseFormsFolderSlugFromPathname("/hub/forms/folders/locked-folder"),
    ).toBe("locked-folder");
  });

  it("returns null for non-folder routes", () => {
    expect(parseFormsFolderSlugFromPathname("/forms")).toBeNull();
    expect(parseFormsFolderSlugFromPathname("/forms/create")).toBeNull();
  });
});

describe("resolveDefaultCreateFolder", () => {
  it("resolves by folder id", () => {
    expect(resolveDefaultCreateFolder(folders, { folderId: "1" })?.name).toBe(
      "Locked Folder",
    );
  });

  it("resolves by folder slug", () => {
    expect(
      resolveDefaultCreateFolder(folders, { folderSlug: "locked-folder" })?.id,
    ).toBe("1");
  });

  it("ignores inactive folders", () => {
    expect(
      resolveDefaultCreateFolder(folders, { folderId: "2" }),
    ).toBeUndefined();
  });
});

describe("resolveEffectiveCreateFolderId", () => {
  it("falls back to raw folder id when folder is not in the list yet", () => {
    expect(resolveEffectiveCreateFolderId([], { folderId: "99" })).toBe("99");
  });

  it("prefers resolved active folder id", () => {
    expect(
      resolveEffectiveCreateFolderId(folders, { folderSlug: "locked-folder" }),
    ).toBe("1");
  });
});

describe("buildCreateFormHref", () => {
  it("prefers folder id when provided", () => {
    expect(
      buildCreateFormHref({ folderId: "1", folderSlug: "locked-folder" }),
    ).toBe("/forms/create?folderId=1");
  });

  it("falls back to folder slug", () => {
    expect(buildCreateFormHref({ folderSlug: "locked-folder" })).toBe(
      "/forms/create?folderSlug=locked-folder",
    );
  });
});

describe("getSelectableCreateFolders", () => {
  it("includes default folder when it is not in the active list", () => {
    expect(getSelectableCreateFolders(folders, "2")).toHaveLength(2);
  });

  it("includes synthetic folder when only id and name are known", () => {
    const options = getSelectableCreateFolders([], "99", "Current Folder");
    expect(options).toEqual([
      {
        id: "99",
        name: "Current Folder",
        slug: "",
        isActive: true,
        immutable: false,
      },
    ]);
  });
});
