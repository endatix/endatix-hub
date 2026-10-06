import { describe, expect, it } from "vitest";
import { AudiencePaging } from "@/lib/endatix-api/audience/types";
import { parsePeoplePaging } from "../get-audience-page/parse-people-page";

describe("parsePeoplePaging", () => {
  it("uses page 1 and the default size when the query is missing or not a positive number", () => {
    expect(parsePeoplePaging({})).toEqual({
      page: 1,
      pageSize: AudiencePaging.DefaultPageSize,
    });
    expect(parsePeoplePaging({ page: "0", pageSize: "nope" })).toEqual({
      page: 1,
      pageSize: AudiencePaging.DefaultPageSize,
    });
  });

  it("keeps a positive page and size", () => {
    expect(parsePeoplePaging({ page: "3", pageSize: "25" })).toEqual({
      page: 3,
      pageSize: 25,
    });
  });

  it("caps the size at the API maximum", () => {
    expect(parsePeoplePaging({ pageSize: "99999" }).pageSize).toBe(
      AudiencePaging.MaxPageSize,
    );
  });
});
