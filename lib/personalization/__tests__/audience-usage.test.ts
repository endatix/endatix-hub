import { describe, expect, it } from "vitest";
import { formatCount } from "../audience-usage";

describe("formatCount", () => {
  it("groups thousands with a comma, whatever the viewer's locale", () => {
    expect(formatCount(4790)).toBe("4,790");
    expect(formatCount(1234567)).toBe("1,234,567");
    expect(formatCount(0)).toBe("0");
  });
});
