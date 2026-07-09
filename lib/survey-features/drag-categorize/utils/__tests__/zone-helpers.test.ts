import { describe, expect, it } from "vitest";
import {
  getItemZones,
  isItemPlaced,
  isPlacementEmpty,
  parsePlacement,
  placeItem,
  sanitizePlacement,
} from "../zone-helpers";

describe("parsePlacement", () => {
  it("returns empty record for non-object values", () => {
    // Act & Assert
    expect(parsePlacement(undefined)).toEqual({});
    expect(parsePlacement(null)).toEqual({});
    expect(parsePlacement("text")).toEqual({});
    expect(parsePlacement(["a"])).toEqual({});
  });

  it("keeps only array zone entries with scalar values", () => {
    // Arrange
    const raw = {
      zone_a: ["item_1", 2, { bad: true }],
      zone_b: "not-an-array",
    };

    // Act
    const placement = parsePlacement(raw);

    // Assert
    expect(placement).toEqual({ zone_a: ["item_1", "2"] });
  });
});

describe("getItemZones / isItemPlaced", () => {
  it("finds every zone containing the item", () => {
    // Arrange
    const placement = {
      zone_a: ["item_1"],
      zone_b: ["item_1", "item_2"],
      zone_c: [],
    };

    // Act & Assert
    expect(getItemZones(placement, "item_1")).toEqual(["zone_a", "zone_b"]);
    expect(isItemPlaced(placement, "item_2")).toBe(true);
    expect(isItemPlaced(placement, "item_3")).toBe(false);
  });
});

describe("placeItem", () => {
  it("moves an item from pool into a zone", () => {
    // Act
    const next = placeItem({
      placement: {},
      itemValue: "item_1",
      toZoneId: "zone_a",
      clone: false,
    });

    // Assert
    expect(next).toEqual({ zone_a: ["item_1"] });
  });

  it("moves an item between zones removing it from the source", () => {
    // Arrange
    const placement = { zone_a: ["item_1", "item_2"] };

    // Act
    const next = placeItem({
      placement,
      itemValue: "item_1",
      fromZoneId: "zone_a",
      toZoneId: "zone_b",
      clone: false,
    });

    // Assert
    expect(next).toEqual({ zone_a: ["item_2"], zone_b: ["item_1"] });
    expect(placement).toEqual({ zone_a: ["item_1", "item_2"] });
  });

  it("clones an item into a zone keeping the source placement", () => {
    // Arrange
    const placement = { zone_a: ["item_1"] };

    // Act
    const next = placeItem({
      placement,
      itemValue: "item_1",
      fromZoneId: "zone_a",
      toZoneId: "zone_b",
      clone: true,
    });

    // Assert
    expect(next).toEqual({ zone_a: ["item_1"], zone_b: ["item_1"] });
  });

  it("does not duplicate an item already in the destination zone", () => {
    // Act
    const next = placeItem({
      placement: { zone_a: ["item_1"] },
      itemValue: "item_1",
      toZoneId: "zone_a",
      clone: true,
    });

    // Assert
    expect(next).toEqual({ zone_a: ["item_1"] });
  });

  it("returns an item to the pool by removing it from the source zone", () => {
    // Act
    const next = placeItem({
      placement: { zone_a: ["item_1", "item_2"] },
      itemValue: "item_1",
      fromZoneId: "zone_a",
      toZoneId: undefined,
      clone: false,
    });

    // Assert
    expect(next).toEqual({ zone_a: ["item_2"] });
  });
});

describe("sanitizePlacement", () => {
  it("drops unknown zones and unknown item values", () => {
    // Arrange
    const placement = {
      zone_a: ["item_1", "ghost"],
      zone_gone: ["item_1"],
    };

    // Act
    const next = sanitizePlacement(
      placement,
      ["zone_a"],
      ["item_1", "item_2"],
    );

    // Assert
    expect(next).toEqual({ zone_a: ["item_1"] });
  });

  it("returns the same reference when nothing changes", () => {
    // Arrange
    const placement = { zone_a: ["item_1"] };

    // Act
    const next = sanitizePlacement(placement, ["zone_a"], ["item_1"]);

    // Assert
    expect(next).toBe(placement);
  });
});

describe("isPlacementEmpty", () => {
  it("treats empty arrays as empty", () => {
    // Act & Assert
    expect(isPlacementEmpty({})).toBe(true);
    expect(isPlacementEmpty({ zone_a: [] })).toBe(true);
    expect(isPlacementEmpty({ zone_a: ["item_1"] })).toBe(false);
  });
});
