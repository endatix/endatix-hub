import { describe, expect, it } from "vitest";
import {
  appendPagingQueryParams,
  appendQueryParam,
  appendQueryParams,
  buildEndpointWithQuery,
  buildQueryEndpoint,
} from "../query-params";

describe("query params", () => {
  it("appends defined scalar values and skips empty values", () => {
    const searchParams = new URLSearchParams();

    appendQueryParam(searchParams, "page", 2);
    appendQueryParam(searchParams, "search", "");
    appendQueryParam(searchParams, "role", undefined);
    appendQueryParam(searchParams, "active", true);

    expect(searchParams.toString()).toBe("page=2&active=true");
  });

  it("appends multiple query params in order", () => {
    const searchParams = new URLSearchParams();

    appendQueryParams(searchParams, [
      ["page", 1],
      ["pageSize", 25],
      ["search", "survey admin"],
    ]);

    expect(searchParams.toString()).toBe(
      "page=1&pageSize=25&search=survey+admin",
    );
  });

  it("uses paging defaults only when request values are missing", () => {
    const searchParams = new URLSearchParams();

    appendPagingQueryParams(
      searchParams,
      { pageSize: 50 },
      { page: 1, pageSize: 10 },
    );

    expect(searchParams.toString()).toBe("page=1&pageSize=50");
  });

  it("returns the original path when there are no query params", () => {
    expect(buildEndpointWithQuery("/users", new URLSearchParams())).toBe(
      "/users",
    );
  });

  it("builds endpoints with encoded query strings", () => {
    expect(
      buildQueryEndpoint("/roles", [
        ["page", 2],
        ["roleType", "custom"],
        ["search", "product admin"],
      ]),
    ).toBe("/roles?page=2&roleType=custom&search=product+admin");
  });
});
