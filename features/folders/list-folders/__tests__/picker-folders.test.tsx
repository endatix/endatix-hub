import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { usePickerFolders } from "../use-picker-folders";
import { FolderReadBoundary } from "../ui/folder-read-boundary";

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/features/folders/server", () => ({ listFoldersAction: list }));
function Picker() {
  const choices = usePickerFolders(true);
  return (
    <FolderReadBoundary {...choices}>
      {choices.folders?.map((f) => f.name).join(", ") ?? "Loading folders"}
    </FolderReadBoundary>
  );
}
it("lets a picker retry a 503 and renders the recovered choices", async () => {
  list
    .mockResolvedValueOnce(
      Result.error("Service unavailable", undefined, undefined, {
        statusCode: 503,
      }),
    )
    .mockResolvedValueOnce(Result.success([{ name: "Archive" }]));
  render(<Picker />);
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Archive")).toBeTruthy();
});
it("presents an ordinary denial instead of empty choices or a retry", async () => {
  list.mockResolvedValueOnce(
    Result.error("Access denied", undefined, undefined, { statusCode: 403 }),
  );
  render(<Picker />);
  expect(await screen.findByText("Access denied")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
