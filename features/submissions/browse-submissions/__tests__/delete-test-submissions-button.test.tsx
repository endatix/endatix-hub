import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { DeleteTestSubmissionsButton } from "../ui/delete-test-submissions-button";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const actions = vi.hoisted(() => ({
  count: vi.fn(),
  deleteTests: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/ui/toast", () => ({ toast }));
vi.mock("../submission-test-flag.action", () => ({
  countTestSubmissionsAction: actions.count,
  deleteTestSubmissionsAction: actions.deleteTests,
}));

function openDialog() {
  render(<DeleteTestSubmissionsButton formId="5" disabled={false} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Delete test submissions" }),
  );
}

const deleteButton = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Delete" });

describe("DeleteTestSubmissionsButton", () => {
  beforeEach(() => {
    actions.count.mockResolvedValue(Result.success(3));
  });

  it("counts on open and names the count in the confirm", async () => {
    // Act
    openDialog();

    // Assert
    expect(await screen.findByText("Delete 3 test submissions?")).toBeTruthy();
    expect(actions.count).toHaveBeenCalledWith("5");
  });

  it("deletes, says how many, closes, and reads the rows again", async () => {
    // Arrange
    actions.deleteTests.mockResolvedValue(Result.success({ deletedCount: 3 }));
    openDialog();
    await screen.findByText("Delete 3 test submissions?");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // Assert
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Deleted 3 test submissions."),
    );
    expect(actions.deleteTests).toHaveBeenCalledWith("5");
    expect(router.refresh).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByText("Delete 3 test submissions?")).toBeNull(),
    );
  });

  it("keeps a refusal in the dialog and does not refresh", async () => {
    // Arrange
    actions.deleteTests.mockResolvedValue(
      Result.error("You cannot delete submissions."),
    );
    openDialog();
    await screen.findByText("Delete 3 test submissions?");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // Assert
    expect(
      await screen.findByText("You cannot delete submissions."),
    ).toBeTruthy();
    expect(screen.getByText("Delete 3 test submissions?")).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("disables Delete when there is nothing to delete", async () => {
    // Arrange
    actions.count.mockResolvedValue(Result.success(0));

    // Act
    openDialog();

    // Assert
    expect(
      await screen.findByText("There are no test submissions to delete."),
    ).toBeTruthy();
    expect(deleteButton().disabled).toBe(true);
  });

  it("still allows Delete when the count cannot be read, and says so", async () => {
    // Arrange
    actions.count.mockResolvedValue(Result.error("Unable to count."));

    // Act
    openDialog();

    // Assert
    expect(
      await screen.findByText("Delete all test submissions?"),
    ).toBeTruthy();
    expect(
      screen.getByText(/could not be read/, { exact: false }),
    ).toBeTruthy();
    expect(deleteButton().disabled).toBe(false);
  });
});
