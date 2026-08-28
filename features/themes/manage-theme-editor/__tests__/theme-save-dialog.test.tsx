import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeSaveDialog, type ThemeSaveRequest } from "../ui/theme-save-dialog";

afterEach(cleanup);

function makeRequest(
  overrides: Partial<ThemeSaveRequest> = {},
): ThemeSaveRequest {
  return {
    themeName: "Acme Brand",
    isDefaultTheme: false,
    resolve: vi.fn(),
    ...overrides,
  };
}

describe("ThemeSaveDialog", () => {
  it("renders nothing when no save is pending", () => {
    const { container } = render(<ThemeSaveDialog request={null} />);
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("overwrites the current theme by default", () => {
    const request = makeRequest();
    render(<ThemeSaveDialog request={request} />);

    fireEvent.click(
      screen.getByRole("button", { name: /^(Save|Create) theme$/ }),
    );

    expect(request.resolve).toHaveBeenCalledWith({ action: "overwrite" });
  });

  it("saves as a new theme when the user opts in", () => {
    const request = makeRequest();
    render(<ThemeSaveDialog request={request} />);

    fireEvent.click(screen.getByLabelText(/save as a new theme instead/i));
    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "  Midnight  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^(Save|Create) theme$/ }),
    );

    expect(request.resolve).toHaveBeenCalledWith({
      action: "save-as-new",
      name: "Midnight",
    });
  });

  it("forces save-as-new for the reserved Default theme", () => {
    const request = makeRequest({ themeName: "default", isDefaultTheme: true });
    render(<ThemeSaveDialog request={request} />);

    // No overwrite option is offered at all.
    expect(screen.queryByLabelText(/save as a new theme instead/i)).toBeNull();
    expect(screen.getByLabelText("Theme name")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "Midnight" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^(Save|Create) theme$/ }),
    );

    expect(request.resolve).toHaveBeenCalledWith({
      action: "save-as-new",
      name: "Midnight",
    });
  });

  it("requires a name and rejects the reserved one", () => {
    const request = makeRequest({ themeName: "default", isDefaultTheme: true });
    render(<ThemeSaveDialog request={request} />);
    const save = () =>
      screen.getByRole("button", { name: /^(Save|Create) theme$/ });

    fireEvent.click(save());
    expect(screen.getByText("Theme name is required")).toBeTruthy();
    expect(request.resolve).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "DeFaUlT" },
    });
    fireEvent.click(save());
    expect(
      screen.getByText("\u201cDefault\u201d is reserved. Choose another name."),
    ).toBeTruthy();
    expect(request.resolve).not.toHaveBeenCalled();
  });

  it("lets the user discard the theme changes explicitly", () => {
    const request = makeRequest();
    render(<ThemeSaveDialog request={request} />);

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(request.resolve).toHaveBeenCalledWith({ action: "skip" });
  });

  it("cannot be dismissed with Escape", () => {
    const request = makeRequest();
    render(<ThemeSaveDialog request={request} />);

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    expect(request.resolve).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
