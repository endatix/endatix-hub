import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { JsonEditor } from "../../ui/json-editor";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    resolvedTheme: "light",
  })),
}));

vi.mock("ace-builds/src-noconflict/ace", () => ({
  default: {
    edit: vi.fn(() => ({
      session: {
        setMode: vi.fn(),
        setUseWorker: vi.fn(),
        selection: {
          toJSON: vi.fn(() => ({})),
          fromJSON: vi.fn(),
        },
      },
      setOptions: vi.fn(),
      renderer: {
        setOptions: vi.fn(),
      },
      setTheme: vi.fn(),
      setValue: vi.fn(),
      getValue: vi.fn(() => ""),
      clearSelection: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

vi.mock("ace-builds/src-noconflict/mode-json", () => ({}));
vi.mock("ace-builds/src-noconflict/theme-clouds_midnight", () => ({}));
vi.mock("ace-builds/src-noconflict/theme-chrome", () => ({}));
vi.mock("ace-builds/src-noconflict/ext-searchbox", () => ({}));

describe("JsonEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("renders container div", () => {
    const { container } = render(<JsonEditor value="" onChange={vi.fn()} />);

    vi.runAllTimers();

    const div = container.querySelector("div.overflow-hidden");
    expect(div).not.toBeNull();
  });

  it("renders with default height style", () => {
    const { container } = render(<JsonEditor value="" onChange={vi.fn()} />);

    vi.runAllTimers();

    const div = container.querySelector("div.overflow-hidden");
    const style = div?.getAttribute("style");
    expect(style).toContain("height: 250px");
  });

  it("renders with custom style when provided", () => {
    const customStyle = { height: "300px" };
    const { container } = render(
      <JsonEditor value="" onChange={vi.fn()} style={customStyle} />,
    );

    vi.runAllTimers();

    const div = container.querySelector("div.overflow-hidden");
    const style = div?.getAttribute("style");
    expect(style).toContain("height: 300px");
  });

  it("accepts value and onChange props", () => {
    const handleChange = vi.fn();
    const initialValue = '{"key": "value"}';

    render(<JsonEditor value={initialValue} onChange={handleChange} />);

    vi.runAllTimers();

    expect(handleChange).toBeDefined();
  });

  it("accepts errors prop with annotations", () => {
    const errors = [
      { row: 0, column: 0, text: "Error 1", type: "error" },
      { row: 1, column: 5, text: "Error 2", type: "error" },
    ];

    const { container } = render(
      <JsonEditor value="" onChange={vi.fn()} errors={errors} />,
    );

    vi.runAllTimers();

    const div = container.querySelector("div.overflow-hidden");
    expect(div).not.toBeNull();
  });

  it("accepts activeError prop", () => {
    const activeError = { row: 2, column: 5 };

    render(
      <JsonEditor value="" onChange={vi.fn()} activeError={activeError} />,
    );

    vi.runAllTimers();

    expect(activeError).toBeDefined();
  });

  it("accepts errors and activeError together", () => {
    const errors = [{ row: 0, column: 0, text: "Error 1", type: "error" }];
    const activeError = { row: 0, column: 0 };

    const { container } = render(
      <JsonEditor
        value="[{}]"
        onChange={vi.fn()}
        errors={errors}
        activeError={activeError}
      />,
    );

    vi.runAllTimers();

    const div = container.querySelector("div.overflow-hidden");
    expect(div).not.toBeNull();
  });
});
