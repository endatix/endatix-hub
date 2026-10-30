import { describe, expect, it } from "vitest";
import {
  audienceListSearch,
  parseAudienceReturnQuery,
} from "../audience-return-to";

describe("audienceListSearch", () => {
  it("keeps a later page, a non-default size, Properties, and the test filter", () => {
    expect(
      audienceListSearch({
        page: "2",
        pageSize: "25",
        view: "properties",
        test: "test",
      }),
    ).toBe("page=2&pageSize=25&view=properties&test=test");
  });

  it("drops the defaults and a filter it does not know", () => {
    expect(
      audienceListSearch({
        page: "1",
        pageSize: "50",
        view: "nope",
        test: "maybe",
      }),
    ).toBe("");
  });
});

describe("audienceListSearch search", () => {
  it("keeps the search, trimmed, so Back from a participant restores it", () => {
    expect(audienceListSearch({ q: "  acme ", test: "real" })).toBe(
      "test=real&q=acme",
    );
  });

  it("drops a blank search and cuts one past the longest the API takes", () => {
    expect(audienceListSearch({ q: "   " })).toBe("");
    expect(audienceListSearch({ q: "x".repeat(300) })).toBe(
      `q=${"x".repeat(256)}`,
    );
    expect(audienceListSearch({ q: `${"x".repeat(255)} tail` })).toBe(
      `q=${"x".repeat(255)}`,
    );
  });
});

describe("parseAudienceReturnQuery", () => {
  it("restores the search with the filter", () => {
    expect(parseAudienceReturnQuery("q=acme&page=2")).toBe("page=2&q=acme");
  });

  it("drops keys the list does not own", () => {
    expect(parseAudienceReturnQuery("page=3&test=real&from=https://evil")).toBe(
      "page=3&test=real",
    );
  });
});
