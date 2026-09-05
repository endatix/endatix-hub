import { describe, expect, it } from "vitest";
import { normalizeEnumValue } from "../normalize-export-enums";
import { DELIVERY_VALUES } from "../normalize-export-enums";

describe("normalizeEnumValue for delivery formats", () => {
  it("accepts Xlsx by name and numeric index", () => {
    expect(normalizeEnumValue("Xlsx", DELIVERY_VALUES)).toBe("Xlsx");
    expect(normalizeEnumValue("xlsx", DELIVERY_VALUES)).toBe("Xlsx");
    expect(normalizeEnumValue(2, DELIVERY_VALUES)).toBe("Xlsx");
  });
});
