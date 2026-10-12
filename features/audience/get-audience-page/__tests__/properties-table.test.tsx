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
    expect(within(first!).getByText("Match key")).toBeTruthy();
    expect(
      within(first!).getByText(/People are matched by External ID/),
    ).toBeTruthy();
    expect(within(second!).getAllByText("age").length).toBeGreaterThan(0);
    expect(within(third!).getAllByText("city").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Match key")).toHaveLength(1);
  });

  it("tags nothing when no property is named like the match key", () => {
    render(
      <PropertiesTable
        identifierKind={AudienceIdentifierKind.Email}
        properties={[named("age"), named("external_id")]}
      />,
    );

    expect(screen.queryByText("Match key")).toBeNull();
  });
});
