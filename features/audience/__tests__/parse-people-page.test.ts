import { describe, expect, it } from "vitest";
import { parsePeoplePage } from "../get-audience-page/parse-people-page";

describe("parsePeoplePage", () => {
  it("uses page 1 when the query is missing or not a positive integer", () => {
    expect(parsePeoplePage(undefined)).toBe(1);
    expect(parsePeoplePage("0")).toBe(1);
    expect(parsePeoplePage("nope")).toBe(1);
  });

  it("keeps a positive page number", () => {
    expect(parsePeoplePage("3")).toBe(3);
  });
});
