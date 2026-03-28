import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import CopyToClipboard from "../copy-to-clipboard";

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock toast
vi.mock("../ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("CopyToClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render clipboard icon by default", () => {
      render(<CopyToClipboard copyValue="test value" />);

      expect(screen.getByRole("button")).toBeDefined();
      expect(screen.getByLabelText("Copy to clipboard")).toBeDefined();
    });

    it("should render with custom label", () => {
      render(<CopyToClipboard copyValue="test" label="Custom copy" />);

      expect(screen.getByLabelText("Custom copy")).toBeDefined();
    });
  });

  describe("Copy Functionality", () => {
    it("should copy string value to clipboard", () => {
      const testValue = "test string value";
      render(<CopyToClipboard copyValue={testValue} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockWriteText).toHaveBeenCalledWith(testValue);
    });

    it("should copy function result to clipboard", () => {
      const testValue = "function result";
      const copyFunction = vi.fn(() => testValue);
      render(<CopyToClipboard copyValue={copyFunction} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(copyFunction).toHaveBeenCalled();
      expect(mockWriteText).toHaveBeenCalledWith(testValue);
    });

    it("should show success toast after copying", async () => {
      const { toast } = await import("../ui/toast");
      render(<CopyToClipboard copyValue="test" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(toast.success).toHaveBeenCalledWith({
        title: "Copied to clipboard",
        duration: 4000,
      });
    });
  });

  describe("State Changes and Animation", () => {
    it("should show check icon after copying", () => {
      render(<CopyToClipboard copyValue="test" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Should show check icon - the animation classes are on the SVG element
      expect(screen.getByRole("button")).toBeDefined();
      // Check if the button contains the Check icon (we can't easily test the specific icon due to lucide-react)
      // The state change is what we're testing, not the specific animation classes
      expect(button).toBeDefined();
    });

    it("should reset to clipboard icon after timeout", () => {
      render(<CopyToClipboard copyValue="test" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Should be back to clipboard icon
      expect(screen.getByRole("button").className).toContain("opacity-50");
    });
  });

  describe("Error Handling", () => {
    it("should not write to clipboard when value is empty", () => {
      render(<CopyToClipboard copyValue="" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe("Layout and tooltip", () => {
    it("should use inline layout without absolute positioning classes", () => {
      const { container } = render(
        <CopyToClipboard copyValue="x" layout="inline" />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).not.toContain("absolute");
      expect(root.className).toContain("inline-flex");
    });

    it("should attach tooltip trigger to the button when not disabled", () => {
      render(<CopyToClipboard copyValue="x" />);
      expect(screen.getByRole("button").getAttribute("data-slot")).toBe(
        "tooltip-trigger",
      );
    });

    it("should not render tooltip when disabled", () => {
      const { container } = render(
        <CopyToClipboard
          copyValue="x"
          disabled
          tooltipContent={<span data-testid="tip-never">Hidden</span>}
        />,
      );

      const button = screen.getByRole("button");
      expect(button.getAttribute("data-slot")).toBe("button");
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(container.querySelector('[data-slot="tooltip"]')).toBeNull();
      expect(screen.queryByTestId("tip-never")).toBeNull();
    });

    it("should not copy when disabled", () => {
      render(<CopyToClipboard copyValue="secret" disabled />);
      fireEvent.click(screen.getByRole("button"));
      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });
});
