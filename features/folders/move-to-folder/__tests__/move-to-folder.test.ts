import { describe, expect, it } from "vitest";
import {
  canMove,
  choosableFolders,
  folderHref,
  NO_FOLDER_VALUE,
  pickerValue,
  targetFolderId,
} from "../move-to-folder";

describe("move-to-folder rules", () => {
  it("offers only active folders", () => {
    // Arrange
    const listed = [
      { id: "1", name: "Live", slug: "live", isActive: true },
      { id: "2", name: "Archived", slug: "archived", isActive: false },
    ];

    // Act
    const choices = choosableFolders(listed);

    // Assert
    expect(choices).toEqual([{ id: "1", name: "Live", slug: "live" }]);
  });

  it("maps no folder to the picker value and back to null", () => {
    expect(pickerValue(null)).toBe(NO_FOLDER_VALUE);
    expect(pickerValue(undefined)).toBe(NO_FOLDER_VALUE);
    expect(pickerValue("1")).toBe("1");
    expect(targetFolderId(NO_FOLDER_VALUE)).toBeNull();
    expect(targetFolderId("1")).toBe("1");
  });

  it("allows a move only to another folder", () => {
    expect(canMove("1", "1")).toBe(false);
    expect(canMove("2", "1")).toBe(true);
    expect(canMove(NO_FOLDER_VALUE, "1")).toBe(true);
  });

  it("opens a form folder and a template folder on their own pages", () => {
    expect(folderHref("form", "q3 reviews")).toBe(
      "/forms/folders/q3%20reviews",
    );
    expect(folderHref("template", "hr")).toBe("/forms/templates/folders/hr");
  });
});
