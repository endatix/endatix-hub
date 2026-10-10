import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PropertyValueField } from "../ui/property-value-field";
import { toLocalDateTimeInput } from "../utils";

function renderField(
  dataType: AudienceDataType,
  value = "",
  extra: Partial<AudienceProperty> = {},
) {
  const onChange = vi.fn();
  const property: AudienceProperty = {
    id: "p1",
    formId: "f1",
    variableName: "field",
    name: "Field",
    dataType,
    sortOrder: 0,
    allowsOther: false,
    ...extra,
  };
  render(
    <PropertyValueField
      id="f"
      property={property}
      value={value}
      disabled={false}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("PropertyValueField", () => {
  it.each([
    [AudienceDataType.Text, "text"],
    [AudienceDataType.Number, "number"],
    [AudienceDataType.Date, "date"],
    [AudienceDataType.DateTime, "datetime-local"],
  ])("renders a %s property as an input of type %s", (dataType, inputType) => {
    renderField(dataType);

    expect(screen.getByLabelText("Field").getAttribute("type")).toBe(inputType);
  });

  it("shows a stored date-time in the reader's time zone, to the minute", () => {
    renderField(AudienceDataType.DateTime, "2026-10-05T09:30:15+03:00");

    expect((screen.getByLabelText("Field") as HTMLInputElement).value).toBe(
      toLocalDateTimeInput("2026-10-05T09:30:15+03:00"),
    );
  });

  it("sends an edited date-time with the reader's offset", () => {
    // Arrange
    const onChange = renderField(AudienceDataType.DateTime);

    // Act
    fireEvent.change(screen.getByLabelText("Field"), {
      target: { value: "2026-03-01T09:00" },
    });

    // Assert
    expect(onChange).toHaveBeenCalledWith(
      expect.stringMatching(/^2026-03-01T09:00[+-]\d{2}:\d{2}$/),
    );
  });

  it("keeps a stored choice that is not in the property's list visible and checked", () => {
    // Arrange & Act
    renderField(AudienceDataType.MultipleChoice, '["a","contractor"]', {
      choicesJson: '["a","b"]',
    });

    // Assert
    expect(screen.getByRole("checkbox", { name: "contractor" })).toBeDefined();
    expect(
      screen
        .getByRole("checkbox", { name: "contractor" })
        .getAttribute("data-state"),
    ).toBe("checked");
  });

  it("renders a boolean property as a select that starts on Not set", () => {
    renderField(AudienceDataType.Boolean);

    expect(
      screen.getByRole("combobox", { name: "Field" }).textContent,
    ).toContain("Not set");
  });
});
