import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { createAudiencePropertyAction } from "../create-audience-property.action";
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
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn() } }));
// Radix Select does not open in jsdom; a native select keeps the options and the label.
vi.mock("../../ui/options-select", () => ({
  OptionsSelect: (
    props: Readonly<{
      id: string;
      value: string;
      options: readonly { value: string; label: string }[];
      onChange: (value: string) => void;
    }>,
  ) => (
    <select
      id={props.id}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

// The Radix checkbox (Accept other values) measures with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

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

  it("offers all seven types", () => {
    openPanel();

    const types = Array.from(
      (screen.getByLabelText("Type") as HTMLSelectElement).options,
      (option) => option.text,
    );

    expect(types).toEqual([
      "Text",
      "Number",
      "Boolean",
      "Date",
      "Date & time",
      "Single choice",
      "Multiple choice",
    ]);
  });

  it("asks for choices and Other only for a choice type, and says they are fixed", () => {
    openPanel();
    expect(screen.queryByLabelText("Choices")).toBeNull();

    chooseType("multiple_choice");

    expect(screen.getByLabelText("Choices")).toBeTruthy();
    expect(screen.getByLabelText("Accept other values")).toBeTruthy();
    expect(
      screen.getByText(/can't be changed after the property is created/),
    ).toBeTruthy();
  });

  it.each([
    ["north\nnorth", '"north" is listed twice.'],
    ["north\nsouth|east", "A choice can't contain |."],
    ["north\n\nsouth", "Choices can't be blank."],
  ])("names the choice problem in %j and blocks adding", (text, message) => {
    const dialog = openPanel();
    typeName("Region");
    chooseType("single_choice");

    typeChoices(text);

    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByLabelText("Choices").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(submitButton(dialog).disabled).toBe(true);
  });

  it("blocks adding a choice property until it has a choice", () => {
    const dialog = openPanel();
    typeName("Region");
    chooseType("single_choice");

    expect(submitButton(dialog).disabled).toBe(true);
  });

  it("creates a choice property with its keys in order and Other", async () => {
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success({} as never),
    );
    const dialog = openPanel();
    typeName("Region");
    chooseType("multiple_choice");
    typeChoices("north\nsouth\n");
    fireEvent.click(screen.getByLabelText("Accept other values"));

    fireEvent.click(submitButton(dialog));

    await waitFor(() =>
      expect(createAudiencePropertyAction).toHaveBeenCalledWith({
        formId: "1",
        name: "Region",
        dataType: "multiple_choice",
        choicesJson: '["north","south"]',
        allowsOther: true,
      }),
    );
  });
});

function typeName(value: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value } });
}

function chooseType(value: string) {
  fireEvent.change(screen.getByLabelText("Type"), { target: { value } });
}

function typeChoices(value: string) {
  fireEvent.change(screen.getByLabelText("Choices"), { target: { value } });
}

function submitButton(dialog: HTMLElement) {
  return dialog.querySelector("button[type=submit]") as HTMLButtonElement;
}
