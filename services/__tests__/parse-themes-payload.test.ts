import { describe, expect, it } from "vitest";
import { parseThemesPayload } from "../parse-themes-payload";

const sample = {
  id: "1",
  name: "Brand",
  jsonData: "{}",
};

describe("parseThemesPayload", () => {
  it("reads a JSON array from GET /themes", () => {
    expect(parseThemesPayload([sample])).toEqual([sample]);
  });

  it("reads { items } when present", () => {
    expect(parseThemesPayload({ items: [sample] })).toEqual([sample]);
  });

  it("returns [] when items is missing (legacy bug: empty Theme dropdown)", () => {
    expect(parseThemesPayload({ total: 1 })).toEqual([]);
  });
});
