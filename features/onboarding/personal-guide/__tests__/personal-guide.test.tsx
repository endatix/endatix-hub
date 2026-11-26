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
    <PersonalGuide preference={{ dismissed }} scope="member" links={[]} />
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
  vi.mocked(saveGuide).mockResolvedValueOnce(Result.success(true)).mockResolvedValueOnce(Result.success(false));
  render(<PersonalGuide preference={{ dismissed: false }} scope="member" links={[]} />);

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
  render(<PersonalGuide preference={{ dismissed: false }} scope="previous" links={[]} />);
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  // Assert
  expect((await screen.findByRole("alert")).textContent).toBe("Refresh to try again.");
  expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
});

it("accepts a fresh read even when its value matches the snapshot before a local save", async () => {
  // Arrange
  vi.mocked(saveGuide).mockResolvedValueOnce(Result.success(true));
  const openGuide = () => <PersonalGuide preference={{ dismissed: false }} scope="member" links={[]} />;
  const { rerender } = render(openGuide());
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  await screen.findByText("Help");
  // Act
  rerender(openGuide());
  // Assert
  expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
});

it("keeps the last confirmed dismissal when reopening fails", async () => {
  // Arrange
  vi.mocked(saveGuide).mockResolvedValueOnce(Result.success(true))
    .mockResolvedValueOnce(Result.error("Try reopening again."));
  render(<PersonalGuide preference={{ dismissed: false }} scope="member" links={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  fireEvent.click(await screen.findByText("Help"));
  const reopen = screen.getByRole<HTMLButtonElement>("button", { name: "Getting started" });
  await waitFor(() => expect(reopen.disabled).toBe(false));
  // Act
  fireEvent.click(reopen);
  // Assert
  expect((await screen.findByRole("alert")).textContent).toBe("Try reopening again.");
  expect(screen.queryByRole("heading")).toBeNull();
  expect(screen.getByText("Help")).toBeTruthy();
});

it("keeps a pending write from replacing a newer read with its old response", async () => {
  // Arrange
  const write = Promise.withResolvers<Result<boolean>>();
  vi.mocked(saveGuide).mockReturnValueOnce(write.promise);
  const view = (dismissed: boolean) => <PersonalGuide preference={{ dismissed }} scope="member" links={[]} />;
  const { rerender } = render(view(false));
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss guide" }));
  rerender(view(true));
  rerender(view(false));
  // Assert
  const dismiss = screen.getByRole<HTMLButtonElement>("button", { name: "Dismiss guide" });
  expect(dismiss.disabled).toBe(true);
  await act(async () => {
    write.resolve(Result.success(true));
    await write.promise;
  });
  await waitFor(() => expect(dismiss.disabled).toBe(false));
  expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
});
