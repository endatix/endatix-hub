import { describe, expect, it } from "vitest";
import { resolveFormFolderLink } from "../resolve-form-folder-link";

describe("resolveFormFolderLink", () => {
  const folders = [
    {
      id: "folder-1",
      name: "Marketing",
      slug: "marketing",
      immutable: false,
      isActive: true,
    },
    {
      id: "folder-2",
      name: "Archive",
      slug: "archive",
      immutable: true,
      isActive: false,
    },
  ];

  it("returns unassigned when form has no folder", () => {
    expect(resolveFormFolderLink({ folderId: null }, folders)).toEqual({
      label: "Unassigned",
      unassigned: true,
    });
  });

  it("returns folder chip props with slug when folder is found", () => {
    expect(resolveFormFolderLink({ folderId: "folder-1" }, folders)).toEqual({
      label: "Marketing",
      immutable: false,
      isActive: true,
      folderSlug: "marketing",
    });
  });

  it("returns a generic label when folder id is unknown", () => {
    expect(resolveFormFolderLink({ folderId: "missing" }, folders)).toEqual({
      label: "Folder",
    });
  });
});
