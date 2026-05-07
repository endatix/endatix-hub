import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FolderCreateButton } from "../ui/folder-create-button";
import { Result } from "@/lib/result";

const createFolderAction = vi.fn();

vi.mock("@/features/folders/server", () => ({
  createFolderAction: (...args: unknown[]) => createFolderAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("FolderCreateButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createFolderAction.mockResolvedValue(Result.success({ id: "1" }));
  });

  it("submits normalized slug payload to create action", async () => {
    render(<FolderCreateButton showTrigger={false} openOnLoad />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test Folder" },
    });
    fireEvent.click(screen.getByLabelText("Edit slug"));
    fireEvent.change(
      screen.getByPlaceholderText("Leave empty to derive from name"),
      {
        target: { value: " My Custom__Slug..Value " },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createFolderAction).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "my-custom-slug-value",
        }),
      );
    });
  });
});
