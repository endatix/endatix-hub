import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PropertyValueField } from "../ui/property-value-field";

function renderField(dataType: AudienceDataType, value = "") {
  const property: AudienceProperty = {
    id: "p1",
    formId: "f1",
    variableName: "field",
    name: "Field",
    dataType,
    sortOrder: 0,
    allowsOther: false,
  };
  render(
    <PropertyValueField
      id="f"
      property={property}
      value={value}
      disabled={false}
      onChange={vi.fn()}
    />,
  );
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

  it("shows a stored date-time with seconds and offset in the minutes-only control", () => {
    renderField(AudienceDataType.DateTime, "2026-10-05T09:30:15+03:00");

    expect((screen.getByLabelText("Field") as HTMLInputElement).value).toBe(
      "2026-10-05T09:30",
    );
  });

  it("renders a boolean property as a select that starts on Not set", () => {
    renderField(AudienceDataType.Boolean);

    expect(
      screen.getByRole("combobox", { name: "Field" }).textContent,
    ).toContain("Not set");
  });
});
