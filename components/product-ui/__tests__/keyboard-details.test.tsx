import { OS_MACOS_CLASS } from "@/lib/utils/next-utils";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyboardDetails } from "../keyboard-details";

describe("KeyboardDetails", () => {
  describe("Rendering", () => {
    it("should render default keys when no macOsSpecificKeys provided", () => {
      render(<KeyboardDetails defaultKeys={["Ctrl", "K"]} />);

      expect(screen.getByText("Ctrl")).toBeDefined();
      expect(screen.getByText("K")).toBeDefined();
    });

    it("should render both default and macOS keys when macOsSpecificKeys provided", () => {
      render(
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          macOsSpecificKeys={["⌘", "K"]}
        />,
      );

      expect(screen.getByText("Ctrl")).toBeDefined();
      expect(screen.getAllByText("K")).toHaveLength(2);
      expect(screen.getByText("⌘")).toBeDefined();
    });

    it("should apply custom className to wrapper", () => {
      const { container } = render(
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          className="custom-wrapper-class"
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-wrapper-class");
    });

    it("should render a key group even when defaultKeys is empty", () => {
      const { container } = render(<KeyboardDetails defaultKeys={[]} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.querySelectorAll("kbd")).toHaveLength(0);
    });

    it("should apply custom keyClassName to all keys", () => {
      render(
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          keyClassName="custom-key-class"
        />,
      );

      const keys = screen.getAllByText(/Ctrl|K/);
      keys.forEach((key) => {
        expect(key.className).toContain("custom-key-class");
      });
    });

    it("should render kbd elements for each key", () => {
      render(<KeyboardDetails defaultKeys={["A", "B", "C"]} />);

      expect(screen.getByText("A").tagName).toBe("KBD");
      expect(screen.getByText("B").tagName).toBe("KBD");
      expect(screen.getByText("C").tagName).toBe("KBD");
    });
  });

  describe("Structure", () => {
    it("should render wrapper with correct base classes", () => {
      const { container } = render(
        <KeyboardDetails defaultKeys={["Ctrl", "K"]} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("absolute");
      expect(wrapper.className).toContain("hidden");
      expect(wrapper.className).toContain("sm:flex");
    });

    it("should render key groups with correct structure when both key sets provided", () => {
      const { container } = render(
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          macOsSpecificKeys={["⌘", "K"]}
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      const groups = wrapper.querySelectorAll("div > div");
      expect(groups).toHaveLength(2);
    });

    it("should render single key group when only defaultKeys provided", () => {
      const { container } = render(
        <KeyboardDetails defaultKeys={["Ctrl", "K"]} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      const groups = wrapper.querySelectorAll("div > div");
      expect(groups).toHaveLength(1);
    });
  });

  describe("Props", () => {
    it("should handle single key", () => {
      render(<KeyboardDetails defaultKeys={["Escape"]} />);

      expect(screen.getByText("Escape")).toBeDefined();
    });

    it("should handle multiple keys in defaultKeys", () => {
      render(
        <KeyboardDetails defaultKeys={["Shift", "Ctrl", "Alt", "Delete"]} />,
      );

      expect(screen.getByText("Shift")).toBeDefined();
      expect(screen.getByText("Ctrl")).toBeDefined();
      expect(screen.getByText("Alt")).toBeDefined();
      expect(screen.getByText("Delete")).toBeDefined();
    });

    it("should handle empty macOsSpecificKeys array", () => {
      const { container } = render(
        <KeyboardDetails defaultKeys={["Ctrl", "K"]} macOsSpecificKeys={[]} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      const groups = wrapper.querySelectorAll("div > div");
      expect(groups).toHaveLength(1);
    });
  });

  describe("OS-specific visibility", () => {
    it("should show default keys and hide macOS keys when no OS class on wrapper", () => {
      const { container } = render(
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          macOsSpecificKeys={["⌘", "K"]}
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      const groups = wrapper.querySelectorAll("div > div");
      const defaultGroup = groups[0];
      const macosGroup = groups[1];

      expect(defaultGroup.className).toContain("not-[.os-macos_&]:flex");
      expect(macosGroup.className).toContain("[.os-macos_&]:flex");
    });

    it("should use OS_MACOS_CLASS constant in group class names", () => {
      const { container } = render(
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          macOsSpecificKeys={["⌘", "K"]}
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      const groups = wrapper.querySelectorAll("div > div");
      const defaultGroup = groups[0];
      const macosGroup = groups[1];

      expect(defaultGroup.className).toContain(
        `not-[.${OS_MACOS_CLASS}_&]:flex`,
      );
      expect(macosGroup.className).toContain(`[.${OS_MACOS_CLASS}_&]:flex`);
    });

    it("should render both key groups even when OS class is present", () => {
      const { container } = render(
        <div className={OS_MACOS_CLASS}>
          <KeyboardDetails
            defaultKeys={["Ctrl", "K"]}
            macOsSpecificKeys={["⌘", "K"]}
          />
        </div>,
      );

      const wrapper = container.querySelector(
        '[class*="absolute"]',
      ) as HTMLElement;
      const groups = wrapper.querySelectorAll(":scope > div");
      expect(groups).toHaveLength(2);
    });
  });
});
