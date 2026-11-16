import { createRequire } from "node:module";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacetedFilter } from "@/components/table";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stubPhoneWidth } from "@/test/stubs/phone-width";
import { stubResizeObserver } from "@/test/stubs/resize-observer";

beforeEach(() => {
  stubPhoneWidth();
  stubResizeObserver();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

function PhoneDrawer({
  onStatusChange = vi.fn(),
  onOpenChange = vi.fn(),
}: Readonly<{
  onStatusChange?: (values: Set<string>) => void;
  onOpenChange?: (open: boolean) => void;
}>) {
  return (
    <ResponsivePanel open onOpenChange={onOpenChange}>
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Export submissions</ResponsivePanelTitle>
        <ResponsivePanelDescription>Phone drawer</ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody>
        <FacetedFilter
          variant="field"
          id="status"
          title="Status"
          emptyLabel="All statuses"
          options={[{ label: "Complete", value: "complete" }]}
          selectedValues={new Set()}
          onValueChange={onStatusChange}
        />
        <Select defaultValue="csv">
          <SelectTrigger aria-label="Export format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
          </SelectContent>
        </Select>
      </ResponsivePanelBody>
    </ResponsivePanel>
  );
}

/** What a tap meets: the nearest element that sets `pointer-events` decides (jsdom does not inherit it). */
function takesTaps(element: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const value = node.style.pointerEvents;
    if (value) {
      return value !== "none";
    }
  }
  return true;
}

describe("ResponsivePanel as a phone drawer", () => {
  it("lets a tap reach an option in a popover opened from the drawer", () => {
    // Arrange
    const onStatusChange = vi.fn();
    render(<PhoneDrawer onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByRole("button", { name: /All statuses/ }));
    const option = screen.getByRole("option", { name: "Complete" });

    // Act
    fireEvent.click(option);

    // Assert
    expect(document.body.style.pointerEvents).toBe("none");
    expect(takesTaps(option)).toBe(true);
    expect(onStatusChange).toHaveBeenCalledWith(new Set(["complete"]));
  });

  it("closes only the Select on Escape and keeps the drawer open", () => {
    // Arrange
    const onOpenChange = vi.fn();
    render(<PhoneDrawer onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Export format" }), {
      key: "Enter",
    });
    const listbox = screen.getByRole("listbox");

    // Act
    fireEvent.keyDown(listbox, { key: "Escape" });

    // Assert
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Export submissions" }),
    ).toBeTruthy();
  });

  it("shares one Radix layer stack with Popover and Select", () => {
    // Two copies of the layer package keep two stacks: the drawer would not see a popover as on
    // top of it (endatix-hub#1423). See the @radix-ui/react-dialog override in pnpm-workspace.yaml.
    const layerFrom = (...chain: string[]) =>
      chain.reduce(
        (from, name) => createRequire(from).resolve(name),
        path.join(process.cwd(), "package.json"),
      );
    const layer = "@radix-ui/react-dismissable-layer";

    expect(layerFrom("vaul", "@radix-ui/react-dialog", layer)).toBe(
      layerFrom("radix-ui", "@radix-ui/react-popover", layer),
    );
  });
});
