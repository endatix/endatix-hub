import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { PersonalGuide } from "../personal-guide";
import { saveGuide } from "../save-guide.action";

vi.mock("../save-guide.action", () => ({ saveGuide: vi.fn() }));

it("dismisses the guide and reopens it from Help in place", async () => {
  // Arrange
  vi.mocked(saveGuide).mockResolvedValueOnce(Result.success(true))
    .mockResolvedValueOnce(Result.success(false));
  render(<PersonalGuide dismissed={false} scope="member" links={[]} />);

  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  const help = await screen.findByText("Help");
  expect(document.activeElement).toBe(help);
  fireEvent.click(help);
  fireEvent.click(screen.getByRole("button", { name: "Getting started" }));

  // Assert
  const heading = await screen.findByRole("heading", { name: "Getting started" });
  expect(document.activeElement).toBe(heading);
  expect(vi.mocked(saveGuide).mock.calls).toEqual([["member", true], ["member", false]]);
});

it("keeps the open guide when a saved preference is refused", async () => {
  // Arrange
  vi.mocked(saveGuide).mockResolvedValueOnce(Result.error("Refresh to try again."));
  render(<PersonalGuide dismissed={false} scope="previous" links={[]} />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toBe("Refresh to try again.");
  expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
});
