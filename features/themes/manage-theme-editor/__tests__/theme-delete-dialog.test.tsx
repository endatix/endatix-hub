import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThemeDeleteDialog,
  type ThemeDeleteRequest,
} from "../ui/theme-delete-dialog";

afterEach(cleanup);

function makeRequest(
  overrides: Partial<ThemeDeleteRequest> = {},
): ThemeDeleteRequest {
  return {
    themeName: "Acme Brand",
    formsInUse: [],
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe("ThemeDeleteDialog", () => {
  it("renders nothing when no delete is pending", () => {
    const { container } = render(
      <ThemeDeleteDialog request={null} onClose={vi.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("confirms the delete when the theme is unused", () => {
    const request = makeRequest();
    const onClose = vi.fn();
    render(<ThemeDeleteDialog request={request} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete theme" }));

    expect(request.onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks the delete and links the forms still using the theme", () => {
    const request = makeRequest({
      formsInUse: [
        { id: "f1", name: "Onboarding" },
        { id: "f2", name: "Feedback" },
      ],
    });
    render(<ThemeDeleteDialog request={request} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Delete theme" })).toBeNull();
    expect(screen.getByText(/Forms using this theme \(2\)/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Onboarding" }).getAttribute("href"),
    ).toBe("/forms/f1");

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(request.onConfirm).not.toHaveBeenCalled();
  });
});
