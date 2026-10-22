import { describe, expect, it } from "vitest";
import {
  audienceListHrefFromQuery,
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
      audienceListSearch({ page: "1", pageSize: "50", view: "nope", test: "maybe" }),
    ).toBe("");
  });
});

describe("parseAudienceReturnQuery", () => {
  it("drops keys the list does not own", () => {
    expect(parseAudienceReturnQuery("page=3&test=real&from=https://evil")).toBe(
      "page=3&test=real",
    );
  });

  it("builds the list path from a validated query", () => {
    expect(audienceListHrefFromQuery("12", "page=2&test=test")).toBe(
      "/forms/12/audience?page=2&test=test",
    );
    expect(audienceListHrefFromQuery("12", "")).toBe("/forms/12/audience");
  });
});
