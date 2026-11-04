import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFolderChoices, moveItemToFolder } from "../move-item-to-folder";

const mockMoveForm = vi.fn();
const mockMoveTemplate = vi.fn();
const mockListFolders = vi.fn();

vi.mock("../../move-form-to-folder/move-form-to-folder.action", () => ({
  moveFormToFolderAction: (...args: unknown[]) => mockMoveForm(...args),
}));

vi.mock("../../move-template-to-folder/move-template-to-folder.action", () => ({
  moveTemplateToFolderAction: (...args: unknown[]) => mockMoveTemplate(...args),
}));

vi.mock("../../list-folders/list-folders.action", () => ({
  listFoldersAction: () => mockListFolders(),
}));

describe("moveItemToFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves a form with the form action", async () => {
    // Arrange
    mockMoveForm.mockResolvedValue({ kind: 0, value: undefined });

    // Act
    await moveItemToFolder({ kind: "form", id: "1" }, "folder-1");

    // Assert
    expect(mockMoveForm).toHaveBeenCalledWith("1", "folder-1");
    expect(mockMoveTemplate).not.toHaveBeenCalled();
  });

  it("takes a template out of its folder with the template action", async () => {
    // Arrange
    mockMoveTemplate.mockResolvedValue({ kind: 0, value: undefined });

    // Act
    await moveItemToFolder({ kind: "template", id: "7" }, null);

    // Assert
    expect(mockMoveTemplate).toHaveBeenCalledWith("7", null);
    expect(mockMoveForm).not.toHaveBeenCalled();
  });
});

describe("loadFolderChoices", () => {
  it("returns the active folders", async () => {
    // Arrange
    mockListFolders.mockResolvedValue({
      kind: 0,
      value: [
        { id: "1", name: "Live", slug: "live", isActive: true },
        { id: "2", name: "Archived", slug: "archived", isActive: false },
      ],
    });

    // Act
    const choices = await loadFolderChoices();

    // Assert
    expect(choices).toEqual({
      kind: 0,
      value: [{ id: "1", name: "Live", slug: "live" }],
    });
  });

  it("passes a failure through", async () => {
    // Arrange
    const failure = { kind: 1, message: "No folders" };
    mockListFolders.mockResolvedValue(failure);

    // Act & Assert
    expect(await loadFolderChoices()).toBe(failure);
  });
});
