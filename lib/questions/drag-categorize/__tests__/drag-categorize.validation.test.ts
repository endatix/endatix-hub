import { describe, expect, it } from "vitest";
import { validateZoneConstraints } from "../drag-categorize.validation";

const items = [{ value: "item_1" }, { value: "item_2" }];
const zones = [
  { value: "zone_a", text: "Zone A", minItems: 0, maxItems: 0 },
  { value: "zone_b", text: "Zone B", minItems: 1, maxItems: 2 },
];

describe("validateZoneConstraints", () => {
  it("returns no errors when constraints are satisfied", () => {
    // Arrange
    const source = {
      requireAllItems: true,
      placement: { zone_a: ["item_1"], zone_b: ["item_2"] },
      items,
      zones,
    };

    // Act
    const errors = validateZoneConstraints(source);

    // Assert
    expect(errors).toEqual([]);
  });

  it("reports unplaced items when requireAllItems is enabled", () => {
    // Arrange
    const source = {
      requireAllItems: true,
      placement: { zone_b: ["item_2"] },
      items,
      zones,
    };

    // Act
    const errors = validateZoneConstraints(source);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].getText()).toContain("place all items");
  });

  it("ignores unplaced items when requireAllItems is disabled", () => {
    // Arrange
    const source = {
      requireAllItems: false,
      placement: { zone_b: ["item_2"] },
      items,
      zones,
    };

    // Act
    const errors = validateZoneConstraints(source);

    // Assert
    expect(errors).toEqual([]);
  });

  it("reports a zone below its minimum", () => {
    // Arrange
    const source = {
      requireAllItems: false,
      placement: { zone_a: ["item_1", "item_2"] },
      items,
      zones,
    };

    // Act
    const errors = validateZoneConstraints(source);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].getText()).toContain('"Zone B" needs at least 1');
  });

  it("reports a zone above its maximum", () => {
    // Arrange
    const source = {
      requireAllItems: false,
      placement: { zone_b: ["item_1", "item_2", "item_3"] },
      items,
      zones,
    };

    // Act
    const errors = validateZoneConstraints(source);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].getText()).toContain('"Zone B" allows at most 2');
  });

  it("falls back to the zone value when no title is set", () => {
    // Arrange
    const source = {
      requireAllItems: false,
      placement: {},
      items,
      zones: [{ value: "zone_x", minItems: 1 }],
    };

    // Act
    const errors = validateZoneConstraints(source);

    // Assert
    expect(errors[0].getText()).toContain('"zone_x"');
  });
});
