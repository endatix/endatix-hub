import { describe, expect, it } from "vitest";
import { resolveAnswerZones } from "../answer-display";

const zones = [
  { value: "zone_a", text: "Zone A" },
  { value: "zone_b", text: "Zone B" },
];

describe("resolveAnswerZones", () => {
  it("resolves authored labels", () => {
    // Act
    const result = resolveAnswerZones({
      value: { zone_a: ["item_1"] },
      zones,
      choices: [{ value: "item_1", text: "Item One" }],
    });

    // Assert
    expect(result[0].items).toEqual([
      { value: "item_1", text: "Item One", imageUrl: undefined },
    ]);
  });

  it("leaves an image-only item uncaptioned instead of printing its id", () => {
    // Act — ItemValue.text falls back to the value, so a naive read prints
    // "item_1" here while the runner shows nothing
    const result = resolveAnswerZones({
      value: { zone_a: ["item_1"] },
      zones,
      choices: [
        { value: "item_1", text: "item_1", imageUrl: "https://x/1.png" },
      ],
    });

    // Assert
    expect(result[0].items[0]).toEqual({
      value: "item_1",
      text: "",
      imageUrl: "https://x/1.png",
    });
  });

  it("falls back to the value when there is no label and no image", () => {
    // Act — with nothing else to identify it, the id beats a blank cell
    const result = resolveAnswerZones({
      value: { zone_a: ["item_1"] },
      zones,
      choices: [{ value: "item_1", text: "item_1" }],
    });

    // Assert
    expect(result[0].items[0].text).toBe("item_1");
  });

  it("falls back to the value for an item missing from the definition", () => {
    // Act
    const result = resolveAnswerZones({
      value: { zone_a: ["gone"] },
      zones,
      choices: [],
    });

    // Assert
    expect(result[0].items[0].text).toBe("gone");
  });

  it("keeps zones the definition dropped, named by their stored id", () => {
    // Act — editing the form must not erase what the respondent answered
    const result = resolveAnswerZones({
      value: { zone_a: ["item_1"], zone_gone: ["item_2"] },
      zones,
      choices: [
        { value: "item_1", text: "Item One" },
        { value: "item_2", text: "Item Two" },
      ],
    });

    // Assert — declared zones first, orphans appended
    expect(result.map((zone) => zone.value)).toEqual([
      "zone_a",
      "zone_b",
      "zone_gone",
    ]);
    expect(result[2].title).toBe("zone_gone");
    expect(result[2].items[0].text).toBe("Item Two");
  });

  it("ignores an orphaned zone that holds nothing", () => {
    // Act
    const result = resolveAnswerZones({
      value: { zone_gone: [] },
      zones,
      choices: [],
    });

    // Assert
    expect(result.map((zone) => zone.value)).toEqual(["zone_a", "zone_b"]);
  });

  it("titles a zone by its id when none was authored", () => {
    // Act
    const result = resolveAnswerZones({
      value: {},
      zones: [{ value: "zone_a" }],
      choices: [],
    });

    // Assert
    expect(result[0].title).toBe("zone_a");
  });

  it("returns nothing for a question with no zones", () => {
    // Act & Assert
    expect(resolveAnswerZones({ value: {} })).toEqual([]);
  });
});
