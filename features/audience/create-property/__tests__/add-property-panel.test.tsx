import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddPropertyPanel } from "../ui/add-property-panel";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../create-audience-property.action", () => ({
  createAudiencePropertyAction: vi.fn(),
}));

function openPanel() {
  render(<AddPropertyPanel formId="1" />);
  fireEvent.click(screen.getByRole("button", { name: "Add property" }));
  return screen.getByRole("dialog");
}

describe("AddPropertyPanel", () => {
  it("previews the variable name the property will keep", () => {
    openPanel();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Cost Center" },
    });

    expect(screen.getByText("cost_center")).toBeTruthy();
  });

  it("explains, and blocks, a name that yields no variable name", () => {
    const dialog = openPanel();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Град" },
    });

    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByText(/at least one letter or digit/)).toBeTruthy();
    const submit = Array.from(dialog.querySelectorAll("button[type=submit]"));
    expect((submit[0] as HTMLButtonElement).disabled).toBe(true);
  });
});
