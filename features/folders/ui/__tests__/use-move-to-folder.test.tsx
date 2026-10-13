import { act, renderHook } from "@testing-library/react";
import type { Route } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NO_FOLDER_VALUE } from "../move-to-folder-dialog";
import { useMoveToFolder } from "../use-move-to-folder";

const mockListFoldersAction = vi.fn();
const mockMove = vi.fn();
const mockPush = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/features/folders/server", () => ({
  listFoldersAction: () => mockListFoldersAction(),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const folders = {
  kind: 0,
  value: [
    { id: "folder-1", name: "Folder 1", slug: "folder-one", isActive: true },
    { id: "folder-2", name: "Archived", slug: "archived", isActive: false },
  ],
};

async function openedHook(folderId: string | null) {
  const hook = renderHook(() =>
    useMoveToFolder({
      item: { kind: "template", id: "7", name: "Onboarding", folderId },
      move: mockMove,
      folderRoute: (slug) => `/folders/${slug}` as Route,
    }),
  );
  await act(() => hook.result.current.openMoveDialog());
  return hook;
}

async function moveTo(
  hook: Awaited<ReturnType<typeof openedHook>>,
  folderId: string,
) {
  act(() => hook.result.current.dialogProps.onFolderChange(folderId));
  await act(async () => hook.result.current.dialogProps.onMove());
}

describe("useMoveToFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFoldersAction.mockResolvedValue(folders);
  });

  it("opens the picker with the active folders and the current one picked", async () => {
    // Act
    const hook = await openedHook("folder-1");

    // Assert
    const dialog = hook.result.current.dialogProps;
    expect(dialog.open).toBe(true);
    expect(dialog.title).toBe("Move template to folder");
    expect(dialog.fieldId).toBe("move-template-folder-7");
    expect(dialog.folderOptions.map((folder) => folder.id)).toEqual([
      "folder-1",
    ]);
    expect(dialog.selectedFolderId).toBe("folder-1");
    expect(dialog.canMove).toBe(false);
  });

  it("keeps the picker closed when the folders cannot be listed", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({ kind: 1, message: "No folders" });

    // Act
    const hook = await openedHook(null);

    // Assert
    expect(mockToastError).toHaveBeenCalledWith("No folders");
    expect(hook.result.current.dialogProps.open).toBe(false);
  });

  it("moves into the picked folder and links to it", async () => {
    // Arrange
    mockMove.mockResolvedValue({ kind: 0, value: undefined });
    const hook = await openedHook(null);

    // Act
    await moveTo(hook, "folder-1");

    // Assert
    expect(mockMove).toHaveBeenCalledWith("7", "folder-1");
    const toast = mockToastSuccess.mock.calls[0][0];
    expect(toast.title).toBe("Template moved successfully");
    toast.action.onClick();
    expect(mockPush).toHaveBeenCalledWith("/folders/folder-one");
    expect(hook.result.current.dialogProps.open).toBe(false);
    expect(hook.result.current.dialogProps.canMove).toBe(false);
  });

  it("removes the item from its folder without a folder link", async () => {
    // Arrange
    mockMove.mockResolvedValue({ kind: 0, value: undefined });
    const hook = await openedHook("folder-1");

    // Act
    await moveTo(hook, NO_FOLDER_VALUE);

    // Assert
    expect(mockMove).toHaveBeenCalledWith("7", null);
    expect(mockToastSuccess.mock.calls[0][0].action).toBeUndefined();
  });

  it("keeps the picker open when the move fails", async () => {
    // Arrange
    mockMove.mockResolvedValue({ kind: 1, message: "Folder is gone" });
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
