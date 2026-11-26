import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result/result";
import { retryPreparation, startBlank } from "../start-blank.action";
import { WorkspaceStartCard } from "../workspace-start-card";
import { readPreparation } from "../preparation-status.action";

vi.mock("../start-blank.action", () => ({ startBlank: vi.fn(), retryPreparation: vi.fn() }));
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../preparation-status.action", () => ({ readPreparation: vi.fn() }));

it("reads only the visible preparation and refreshes Forms once its state changes", async () => {
  // Arrange
  vi.useFakeTimers();
  vi.mocked(readPreparation).mockResolvedValueOnce(Result.success({kind: "working"}))
    .mockResolvedValueOnce(Result.success({kind: "complete", formId: "42"}));
  const { unmount } = render(<WorkspaceStartCard choice={{ kind: "working" }} scope="workspace" />);
  const status = screen.getByRole("status");
  status.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20);
  try {
    // Act & Assert
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(readPreparation).toHaveBeenCalledWith("workspace");
    expect(router.refresh).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link")).toBeNull();
  } finally {
    unmount();
    vi.useRealTimers();
  }
});

it("can finish blank during preparation without retrying or opening the reserved draft", async () => {
  // Arrange
  vi.mocked(startBlank).mockResolvedValueOnce(Result.success({ kind: "complete", formId: "42" }));
  render(<WorkspaceStartCard choice={{ kind: "working" }} scope="workspace" />);
  // Act & Assert
  expect(screen.getByRole("status").textContent).toContain("come back");
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button", { name: "Retry preparation" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Finish blank" }));
  await waitFor(() => expect(startBlank).toHaveBeenCalledWith("workspace"));
});

it("defers a refresh after session expiry until the owner is watching again", async () => {
  // Arrange
  vi.useFakeTimers();
  const { unmount } = render(<WorkspaceStartCard choice={{ kind: "working" }} scope="workspace" />);
  const status = screen.getByRole("status");
  const refused = Result.error<never>("Session expired", undefined, undefined, { statusCode: 401 });
  status.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20);
  vi.mocked(readPreparation).mockImplementationOnce(async () => {
    status.getBoundingClientRect = () => new DOMRect();
    return refused;
  }).mockResolvedValueOnce(refused);
  try {
    // Act & Assert
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(router.refresh).not.toHaveBeenCalled();
    status.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
  } finally {
    unmount();
    vi.useRealTimers();
  }
});

it("retains both recovery choices after an unconfirmed retry", async () => {
  // Arrange
  vi.mocked(retryPreparation).mockRejectedValueOnce(new TypeError("disconnected"));
  render(<WorkspaceStartCard choice={{ kind: "retryable" }} scope="workspace" canRetry />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Retry preparation" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toContain("Could not confirm");
  expect(retryPreparation).toHaveBeenCalledWith("workspace");
  expect(screen.getByRole("button", { name: "Finish blank" }).hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("link")).toBeNull();
});

it("lets the owner open the committed survey without automatically navigating", () => {
  // Arrange & Act
  render(<WorkspaceStartCard choice={{ kind: "complete", formId: "42" }} scope="workspace" />);
  // Assert
  expect(screen.getByRole("link", { name: "Open my survey" }).getAttribute("href")).toBe(
    "/forms/42/design?from=forms",
  );
  expect(screen.queryByRole("button", { name: "Start blank" })).toBeNull();
});

it("offers a retry after an unavailable choice without opening a draft", async () => {
  // Arrange
  vi.mocked(startBlank).mockResolvedValueOnce(Result.error("Workspace setup is busy. Try again."));
  render(<WorkspaceStartCard choice={{ kind: "offer" }} scope="workspace" />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Start blank" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toContain("Workspace setup is busy");
  expect(screen.getByRole("button", { name: "Start blank" }).hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("link")).toBeNull();
});

it("can resume after the connection drops without claiming success", async () => {
  // Arrange
  vi.mocked(startBlank).mockRejectedValueOnce(new TypeError("disconnected"));
  render(<WorkspaceStartCard choice={{ kind: "offer" }} scope="workspace" />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Start blank" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toContain("Could not confirm your draft");
  expect(screen.queryByRole("link")).toBeNull();
});

it("explains a deleted first survey without offering to recreate it", () => {
  // Arrange & Act
  render(<WorkspaceStartCard choice={{ kind: "complete", formId: null }} scope="workspace" />);
  // Assert
  expect(screen.getByRole("status").textContent).toContain("was deleted");
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
