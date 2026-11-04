import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NO_FOLDER_VALUE } from "../move-to-folder";
import { useMoveToFolder } from "../use-move-to-folder.hook";

const mockLoadFolderChoices = vi.fn();
const mockMoveItemToFolder = vi.fn();
const mockPush = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../move-item-to-folder", () => ({
  loadFolderChoices: () => mockLoadFolderChoices(),
  moveItemToFolder: (...args: unknown[]) => mockMoveItemToFolder(...args),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const item = { kind: "template" as const, id: "7", name: "Onboarding" };
const choices = {
  kind: 0,
  value: [{ id: "folder-1", name: "Folder 1", slug: "folder-one" }],
};

async function openedHook(folderId: string | null) {
  const hook = renderHook(() => useMoveToFolder({ ...item, folderId }));
  await act(() => hook.result.current.openMoveDialog());
  return hook;
}

async function moveTo(
  hook: Awaited<ReturnType<typeof openedHook>>,
  picked: string,
) {
  act(() => hook.result.current.dialogProps.onFolderChange(picked));
  await act(async () => hook.result.current.dialogProps.onMove());
}

describe("useMoveToFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadFolderChoices.mockResolvedValue(choices);
  });

  it("opens the picker on the item's folder", async () => {
    // Act
    const hook = await openedHook("folder-1");

    // Assert
    const dialog = hook.result.current.dialogProps;
    expect(dialog.open).toBe(true);
    expect(dialog.title).toBe("Move template to folder");
    expect(dialog.fieldId).toBe("move-template-folder-7");
    expect(dialog.folderOptions).toEqual(choices.value);
    expect(dialog.selectedFolderId).toBe("folder-1");
    expect(dialog.canMove).toBe(false);
  });

  it("keeps the picker closed when the folders cannot be loaded", async () => {
    // Arrange
    mockLoadFolderChoices.mockResolvedValue({ kind: 1, message: "No folders" });

    // Act
    const hook = await openedHook(null);

    // Assert
    expect(mockToastError).toHaveBeenCalledWith("No folders");
    expect(hook.result.current.dialogProps.open).toBe(false);
  });

  it("moves into the picked folder and links to it", async () => {
    // Arrange
    mockMoveItemToFolder.mockResolvedValue({ kind: 0, value: undefined });
    const hook = await openedHook(null);

    // Act
    await moveTo(hook, "folder-1");

    // Assert
    expect(mockMoveItemToFolder).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "template", id: "7" }),
      "folder-1",
    );
    const toast = mockToastSuccess.mock.calls[0][0];
    expect(toast.title).toBe("Template moved successfully");
    toast.action.onClick();
    expect(mockPush).toHaveBeenCalledWith(
      "/forms/templates/folders/folder-one",
    );
    expect(hook.result.current.dialogProps.open).toBe(false);
    expect(hook.result.current.dialogProps.canMove).toBe(false);
  });

  it("removes the item from its folder without a folder link", async () => {
    // Arrange
    mockMoveItemToFolder.mockResolvedValue({ kind: 0, value: undefined });
    const hook = await openedHook("folder-1");

    // Act
    await moveTo(hook, NO_FOLDER_VALUE);

    // Assert
    expect(mockMoveItemToFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "7" }),
      null,
    );
    expect(mockToastSuccess.mock.calls[0][0].action).toBeUndefined();
  });

  it("keeps the picker open when the move fails", async () => {
    // Arrange
    mockMoveItemToFolder.mockResolvedValue({
      kind: 1,
      message: "Folder is gone",
    });
    const hook = await openedHook(null);

    // Act
    await moveTo(hook, "folder-1");

    // Assert
    expect(mockToastError).toHaveBeenCalledWith({
      title: "Cannot move template to folder",
      description: "Folder is gone",
    });
    expect(hook.result.current.dialogProps.open).toBe(true);
    expect(hook.result.current.dialogProps.isMovePending).toBe(false);
  });
});
