import { describe, expect, it } from "vitest";
import {
  getItemZones,
  isItemPlaced,
  isPlacementEmpty,
  parsePlacement,
  placeItem,
  reconcilePlacement,
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

describe("reconcilePlacement", () => {
  it("drops unknown zones and items that are not visible", () => {
    // Act
    const result = reconcilePlacement({
      placement: { zone_a: ["item_1", "ghost"], zone_gone: ["item_1"] },
      zoneIds: ["zone_a"],
      visibleItemValues: ["item_1", "item_2"],
    });

    // Assert
    expect(result.placement).toEqual({ zone_a: ["item_1"] });
    expect(result.changed).toBe(true);
  });

  it("reports which zones a hidden item was dropped from", () => {
    // Act
    const result = reconcilePlacement({
      placement: { zone_a: ["item_1"], zone_b: ["item_1", "item_2"] },
      zoneIds: ["zone_a", "zone_b"],
      visibleItemValues: ["item_2"],
    });

    // Assert — item_1 was in both zones, so both must be remembered
    expect(result.removed).toEqual({ item_1: ["zone_a", "zone_b"] });
  });

  it("does not report items dropped because their zone is gone", () => {
    // Act — a deleted zone never comes back, so there is nothing to restore
    const result = reconcilePlacement({
      placement: { zone_gone: ["item_1"] },
      zoneIds: ["zone_a"],
      visibleItemValues: ["item_1"],
    });

    // Assert
    expect(result.removed).toEqual({});
    expect(result.changed).toBe(true);
  });

  it("puts restored items back into the zones they came from", () => {
    // Act — a multi-zone item is the only one that can return to several
    const result = reconcilePlacement({
      placement: { zone_a: ["item_2"] },
      zoneIds: ["zone_a", "zone_b"],
      visibleItemValues: ["item_1", "item_2"],
      multiZoneItemValues: ["item_1"],
      restore: { item_1: ["zone_a", "zone_b"] },
    });

    // Assert
    expect(result.placement).toEqual({
      zone_a: ["item_2", "item_1"],
      zone_b: ["item_1"],
    });
    expect(result.changed).toBe(true);
  });

  it("skips restore targets whose zone no longer exists", () => {
    // Act
    const result = reconcilePlacement({
      placement: { zone_a: [] },
      zoneIds: ["zone_a"],
      visibleItemValues: ["item_1"],
      restore: { item_1: ["zone_gone"] },
    });

    // Assert
    expect(result.placement).toEqual({ zone_a: [] });
    expect(result.changed).toBe(false);
  });

  it("does not duplicate an item that is already placed", () => {
    // Act
    const result = reconcilePlacement({
      placement: { zone_a: ["item_1"] },
      zoneIds: ["zone_a"],
      visibleItemValues: ["item_1"],
      restore: { item_1: ["zone_a"] },
    });

    // Assert
    expect(result.placement).toEqual({ zone_a: ["item_1"] });
    expect(result.changed).toBe(false);
  });

  it("holds a non-clone item to the first zone in definition order", () => {
    // Act — zone order comes from zoneIds, not the placement's key order
    const result = reconcilePlacement({
      placement: { zone_b: ["item_1"], zone_a: ["item_1"] },
      zoneIds: ["zone_a", "zone_b"],
      visibleItemValues: ["item_1"],
    });

    // Assert
    expect(result.placement).toEqual({ zone_a: ["item_1"], zone_b: [] });
    expect(result.changed).toBe(true);
  });

  it("leaves items listed as multi-zone alone", () => {
    // Act
    const result = reconcilePlacement({
      placement: { zone_a: ["item_1"], zone_b: ["item_1"] },
      zoneIds: ["zone_a", "zone_b"],
      visibleItemValues: ["item_1"],
      multiZoneItemValues: ["item_1"],
    });

    // Assert
    expect(result.placement).toEqual({
      zone_a: ["item_1"],
      zone_b: ["item_1"],
    });
    expect(result.changed).toBe(false);
  });

  it("drops a repeated non-clone item within a single zone", () => {
    // Act — duplicates only reach us through imported or prefilled data
    const result = reconcilePlacement({
      placement: { zone_a: ["item_1", "item_1"] },
      zoneIds: ["zone_a"],
      visibleItemValues: ["item_1"],
    });

    // Assert
    expect(result.placement).toEqual({ zone_a: ["item_1"] });
    expect(result.changed).toBe(true);
  });

  it("reports no change when everything is known and visible", () => {
    // Act
    const result = reconcilePlacement({
      placement: { zone_a: ["item_1"] },
      zoneIds: ["zone_a"],
      visibleItemValues: ["item_1"],
    });

    // Assert
    expect(result.changed).toBe(false);
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
