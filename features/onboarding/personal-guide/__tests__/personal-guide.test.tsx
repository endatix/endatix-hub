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
  fireEvent.click(await screen.findByText("Help"));
  fireEvent.click(screen.getByRole("button", { name: "Getting started" }));

  // Assert
  expect(await screen.findByRole("heading", { name: "Getting started" })).toBeTruthy();
  expect(vi.mocked(saveGuide).mock.calls).toEqual([["member", true], ["member", false]]);
});
