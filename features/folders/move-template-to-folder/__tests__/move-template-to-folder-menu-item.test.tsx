import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoveTemplateToFolderMenuItem } from "../ui/move-template-to-folder-menu-item";
import { NO_FOLDER_VALUE } from "@/features/folders/ui/move-to-folder-dialog";

const mockListFoldersAction = vi.fn();
const mockMoveTemplateToFolderAction = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: {
    children: ReactNode;
    onSelect?: (event: {
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => void;
    className?: string;
  }) => (
    <button
      type="button"
      className={className}
      onClick={() =>
        onSelect?.({
          preventDefault: () => undefined,
          stopPropagation: () => undefined,
        })
      }
    >
      {children}
    </button>
  ),
}));

vi.mock("@/features/folders/server", () => ({
  listFoldersAction: () => mockListFoldersAction(),
}));

vi.mock("../move-template-to-folder.action", () => ({
  moveTemplateToFolderAction: (...args: unknown[]) =>
    mockMoveTemplateToFolderAction(...args),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/features/folders/ui/move-to-folder-dialog", () => ({
  NO_FOLDER_VALUE: "__none__",
  MoveToFolderDialog: ({
    open,
    onFolderChange,
    onMove,
    canMove,
    title,
  }: {
    open: boolean;
    onFolderChange: (value: string) => void;
    onMove: () => void;
    canMove: boolean;
    title: string;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <button type="button" onClick={() => onFolderChange("folder-1")}>
          Select Folder 1
        </button>
        <button type="button" onClick={() => onFolderChange(NO_FOLDER_VALUE)}>
          Select No Folder
        </button>
        <button type="button" onClick={onMove} disabled={!canMove}>
          Move
        </button>
      </div>
    ) : null,
}));

describe("MoveTemplateToFolderMenuItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error when listing folders fails", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({
      kind: 1,
      message: "Could not load folders",
    });

    render(
      <MoveTemplateToFolderMenuItem
        templateId="template-1"
        currentFolderId={null}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));

    // Assert
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Could not load folders");
    });
    expect(screen.queryByText("Move template to folder")).toBeNull();
  });

  it("moves template and shows success toast", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({
      kind: 0,
      value: [{ id: "folder-1", name: "Folder 1", isActive: true }],
    });
    mockMoveTemplateToFolderAction.mockResolvedValue({
      kind: 0,
      value: undefined,
    });

    render(
      <MoveTemplateToFolderMenuItem
        templateId="template-1"
        currentFolderId={null}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));
    await screen.findByText("Move template to folder");
    fireEvent.click(screen.getByRole("button", { name: "Select Folder 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    // Assert
    await waitFor(() => {
      expect(mockMoveTemplateToFolderAction).toHaveBeenCalledWith(
        "template-1",
        "folder-1",
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Template moved");
  });

  it("shows error when move fails", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({
      kind: 0,
      value: [{ id: "folder-1", name: "Folder 1", isActive: true }],
    });
    mockMoveTemplateToFolderAction.mockResolvedValue({
      kind: 1,
      message: "Move failed",
    });

    render(
      <MoveTemplateToFolderMenuItem
        templateId="template-1"
        currentFolderId={null}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));
    await screen.findByText("Move template to folder");
    fireEvent.click(screen.getByRole("button", { name: "Select Folder 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    // Assert
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith({
        title: "Cannot move template to folder",
        description: "Move failed",
      });
    });
  });

  it("disables move when target folder is the same as current", async () => {
    mockListFoldersAction.mockResolvedValue({
      kind: 0,
      value: [{ id: "folder-1", name: "Folder 1", isActive: true }],
    });

    render(
      <MoveTemplateToFolderMenuItem
        templateId="template-1"
        currentFolderId="folder-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));
    await screen.findByText("Move template to folder");

    const moveButton = screen.getByRole("button", { name: "Move" });
    expect(moveButton.hasAttribute("disabled")).toBe(true);

    fireEvent.click(moveButton);
    expect(mockMoveTemplateToFolderAction).not.toHaveBeenCalled();
  });
});
