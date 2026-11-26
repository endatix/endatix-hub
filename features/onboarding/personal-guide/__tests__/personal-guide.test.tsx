import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { PersonalGuide } from "../personal-guide";
import { saveGuide } from "../save-guide.action";

vi.mock("../save-guide.action", () => ({ saveGuide: vi.fn() }));

it("renders a refreshed preference without moving focus out of the editor", () => {
  // Arrange
  const view = (dismissed: boolean) => <>
    <input aria-label="Preview answer" />
    <PersonalGuide dismissed={dismissed} scope="member" links={[]} />
  </>;
  const { rerender } = render(view(false));
  const answer = screen.getByRole<HTMLInputElement>("textbox");
  fireEvent.change(answer, { target: { value: "Still editing" } });
  answer.focus();
  // Act & Assert
  rerender(view(true));
  expect(screen.queryByRole("heading")).toBeNull();
  expect(screen.getByText("Help")).toBeTruthy();
  rerender(view(false));
  expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
  expect(document.activeElement).toBe(answer);
  expect(answer.value).toBe("Still editing");
  expect(saveGuide).not.toHaveBeenCalled();
});

it("dismisses the guide and reopens it from Help in place", async () => {
  // Arrange
  const view = (dismissed: boolean) => <PersonalGuide dismissed={dismissed} scope="member" links={[]} />;
  const { rerender } = render(view(false));
  vi.mocked(saveGuide).mockImplementation(async (_, dismissed) => {
    rerender(view(dismissed));
    return Result.success(dismissed);
  });

  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  const help = await screen.findByText("Help");
  expect(document.activeElement).toBe(help);
  fireEvent.click(help);
  const reopen = screen.getByRole<HTMLButtonElement>("button", { name: "Getting started" });
  await waitFor(() => expect(reopen.disabled).toBe(false));
  fireEvent.click(reopen);

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

it("keeps a pending write from replacing a newer read with its old response", async () => {
  // Arrange
  const write = Promise.withResolvers<Result<boolean>>();
  vi.mocked(saveGuide).mockReturnValueOnce(write.promise);
  const view = (dismissed: boolean) => <PersonalGuide dismissed={dismissed} scope="member" links={[]} />;
  const { rerender } = render(view(false));
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  rerender(view(true));
  rerender(view(false));
  // Assert
  const dismiss = screen.getByRole<HTMLButtonElement>("button", { name: "Dismiss guide" });
  expect(dismiss.disabled).toBe(true);
  await act(() => write.resolve(Result.success(true)));
  await waitFor(() => expect(dismiss.disabled).toBe(false));
  expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
});
