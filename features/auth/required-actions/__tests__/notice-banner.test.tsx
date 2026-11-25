import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NoticeBanner } from "../notice-banner";

it("dismisses the notice locally while leaving the page usable", () => {
  // Arrange
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(
    <>
      <NoticeBanner href="/settings/security" />
      <button>Open form</button>
    </>,
  );
  expect(screen.getByRole("link").getAttribute("href")).toBe("/settings/security");

  // Act
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));

  // Assert
  expect(screen.queryByRole("status")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Open form" }).hasAttribute("disabled"),
  ).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
