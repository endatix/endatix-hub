import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../theme-provider";

const mockSetTheme = vi.fn();
const mockResolvedTheme = vi.fn(() => "light");
const mockTrackEvent = vi.fn();

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme(),
    setTheme: mockSetTheme,
  }),
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

describe("ThemeProvider", () => {
  describe("Rendering", () => {
    it("should render children", () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child Content</div>
        </ThemeProvider>,
      );

      expect(screen.getByTestId("child")).toBeDefined();
      expect(screen.getByTestId("child").textContent).toBe("Child Content");
    });

    it("should apply default props", () => {
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>,
      );

      expect(screen.getByText("Test")).toBeDefined();
    });

    it("should accept custom theme props", () => {
      render(
        <ThemeProvider defaultTheme="dark" attribute="data-theme">
          <div>Test</div>
        </ThemeProvider>,
      );

      expect(screen.getByText("Test")).toBeDefined();
    });
  });
});

describe("ThemeHotkey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedTheme.mockReturnValue("light");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should not toggle theme when meta key is pressed", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", metaKey: true }),
      );
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should not toggle theme when ctrl key is pressed", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", ctrlKey: true }),
      );
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should not toggle theme when alt key is pressed", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", altKey: true }),
      );
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should not toggle theme for non-d keys", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should toggle theme when d key is pressed without modifiers", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(mockTrackEvent).toHaveBeenCalledWith("theme_changed", {
      theme: "dark",
      previous_theme: "light",
      resolved_theme: "light",
      source: "hotkey",
    });
  });

  it("should toggle from dark to light", async () => {
    mockResolvedTheme.mockReturnValue("dark");

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(mockTrackEvent).toHaveBeenCalledWith("theme_changed", {
      theme: "light",
      previous_theme: "dark",
      resolved_theme: "dark",
      source: "hotkey",
    });
  });

  it("should not toggle when typing in input", async () => {
    render(
      <ThemeProvider>
        <div>
          <input type="text" data-testid="input" />
        </div>
      </ThemeProvider>,
    );

    const input = screen.getByTestId("input");

    await act(async () => {
      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: "d" });
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should not toggle when typing in textarea", async () => {
    render(
      <ThemeProvider>
        <div>
          <textarea data-testid="textarea" />
        </div>
      </ThemeProvider>,
    );

    const textarea = screen.getByTestId("textarea");

    await act(async () => {
      fireEvent.focus(textarea);
      fireEvent.keyDown(textarea, { key: "d" });
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should not toggle when typing in select", async () => {
    render(
      <ThemeProvider>
        <div>
          <select data-testid="select">
            <option>Option</option>
          </select>
        </div>
      </ThemeProvider>,
    );

    const select = screen.getByTestId("select");

    await act(async () => {
      fireEvent.focus(select);
      fireEvent.keyDown(select, { key: "d" });
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it.skip("should not toggle when typing in contenteditable", async () => {
    render(
      <ThemeProvider>
        <div>
          <div contentEditable data-testid="editor" />
        </div>
      </ThemeProvider>,
    );

    const editor = screen.getByTestId("editor");

    await act(async () => {
      fireEvent.keyDown(editor, { key: "d" });
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should handle uppercase D key", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "D" }));
    });

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("should not toggle when event is default prevented", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "d", bubbles: true });
      Object.defineProperty(event, "defaultPrevented", { value: true });
      window.dispatchEvent(event);
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("should not toggle on key repeat", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "d", repeat: true }),
      );
    });

    expect(mockSetTheme).not.toHaveBeenCalled();
  });
});
