import { describe, expect, it } from "vitest";
import { toLocaleNumber } from "../number-utils";

describe("toLocaleNumber", () => {
  it("groups thousands in en-US", () => {
    expect(toLocaleNumber(5000, "en-US")).toBe("5,000");
    expect(toLocaleNumber(1200, "en-US")).toBe("1,200");
  });

  it("leaves small integers ungrouped", () => {
    expect(toLocaleNumber(12, "en-US")).toBe("12");
  });

  it("stringifies non-finite values", () => {
    expect(toLocaleNumber(Number.NaN)).toBe("NaN");
  });
});
