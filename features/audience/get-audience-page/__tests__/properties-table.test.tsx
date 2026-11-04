import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PropertiesTable } from "../ui/properties-table";

// Radix tooltips (the variable name's copy affordance) measure with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const named = (variableName: string): AudienceProperty => ({
  id: variableName,
  formId: "1",
  variableName,
  name: variableName,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

describe("PropertiesTable", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("pins the property named like the match key first and says why People hides it", () => {
    // Act
    render(
      <PropertiesTable
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={[named("age"), named("external_id"), named("city")]}
      />,
    );

    // Assert
    const [, first, second, third] = screen.getAllByRole("row");
    expect(within(first!).getByText("Identifier")).toBeTruthy();
    expect(
      within(first!).getByText(
        "It matches each participant across forms, so the participants table shows it as their External ID, not as a property.",
      ),
    ).toBeTruthy();
    expect(within(second!).getAllByText("age").length).toBeGreaterThan(0);
    expect(within(third!).getAllByText("city").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Identifier")).toHaveLength(1);
  });

  it("tags nothing when no property is named like the match key", () => {
    render(
      <PropertiesTable
        identifierKind={AudienceIdentifierKind.Email}
        properties={[named("age"), named("external_id")]}
      />,
    );

    expect(screen.queryByText("Identifier")).toBeNull();
  });
});

describe("PropertiesTable coverage", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  const verdicts = {
    notFilledIn: () => [],
    forProperty: (name: string) =>
      name === "tier"
        ? { used: true, filledReal: 4790, real: 4810 }
        : { used: false, filledReal: 0, real: 4810 },
  };

  it("says which properties the saved form reads and how many filled them in", () => {
    render(
      <PropertiesTable
        identifierKind={AudienceIdentifierKind.Email}
        properties={[named("tier"), named("seats")]}
        verdicts={verdicts}
      />,
    );

    const [header, tier, seats] = screen.getAllByRole("row");
    expect(within(header!).getByText("Used in form")).toBeTruthy();
    expect(within(header!).getByText("Filled in (real)")).toBeTruthy();
    expect(within(tier!).getByText("Used")).toBeTruthy();
    expect(within(tier!).getByText("4,790 of 4,810 filled")).toBeTruthy();
    expect(within(seats!).getByText("Not used")).toBeTruthy();
    expect(within(seats!).getByText("0 of 4,810 filled")).toBeTruthy();
  });

  it("has no coverage columns without a review", () => {
    render(
      <PropertiesTable
        identifierKind={AudienceIdentifierKind.Email}
        properties={[named("tier")]}
      />,
    );

    expect(screen.queryByText("Used in form")).toBeNull();
  });
});
