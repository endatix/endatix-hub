import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result/result";
import { startBlank } from "../start-blank.action";
import { WorkspaceStartCard } from "../workspace-start-card";

vi.mock("../start-blank.action", () => ({ startBlank: vi.fn() }));

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
