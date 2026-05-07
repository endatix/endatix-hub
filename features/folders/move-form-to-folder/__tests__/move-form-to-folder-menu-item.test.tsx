import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoveFormToFolderMenuItem } from "../ui/move-form-to-folder-menu-item";

const mockListFoldersAction = vi.fn();
const mockMoveFormToFolderAction = vi.fn();
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

vi.mock("../move-form-to-folder.action", () => ({
  moveFormToFolderAction: (...args: unknown[]) =>
    mockMoveFormToFolderAction(...args),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe("MoveFormToFolderMenuItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error when listing folders fails", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({
      kind: 1,
      message: "Could not load folders",
    });

    render(<MoveFormToFolderMenuItem formId="form-1" currentFolderId={null} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));

    // Assert
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Could not load folders");
    });
    expect(screen.queryByText("Move form to folder")).toBeNull();
  });

  it("moves form and shows success toast", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({
      kind: 0,
      value: [{ id: "folder-1", name: "Folder 1", isActive: true }],
    });
    mockMoveFormToFolderAction.mockResolvedValue({ kind: 0, value: undefined });

    render(<MoveFormToFolderMenuItem formId="form-1" currentFolderId={null} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));
    await screen.findByText("Move form to folder");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    // Assert
    await waitFor(() => {
      expect(mockMoveFormToFolderAction).toHaveBeenCalledWith("form-1", null);
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Form moved");
  });

  it("shows error when move fails", async () => {
    // Arrange
    mockListFoldersAction.mockResolvedValue({
      kind: 0,
      value: [{ id: "folder-1", name: "Folder 1", isActive: true }],
    });
    mockMoveFormToFolderAction.mockResolvedValue({
      kind: 1,
      message: "Move failed",
    });

    render(<MoveFormToFolderMenuItem formId="form-1" currentFolderId={null} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /move to folder/i }));
    await screen.findByText("Move form to folder");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    // Assert
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Move failed");
    });
  });
});
