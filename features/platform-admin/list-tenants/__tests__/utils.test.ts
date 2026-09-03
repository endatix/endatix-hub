import { describe, expect, it } from "vitest";
import {
  parsePlatformTenantListParams,
  listUrlStateFromSearchParams,
  tenantsListSuspenseKey,
} from "../utils";

describe("parsePlatformTenantListParams", () => {
  it("defaults paging and drops unknown sort", () => {
    expect(parsePlatformTenantListParams({ sortBy: "formsCount" })).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      sortBy: undefined,
      sortDir: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      modifiedFrom: undefined,
      modifiedTo: undefined,
    });
  });

  it("coerces Next.js array search params", () => {
    expect(
      parsePlatformTenantListParams({
        search: ["Acme"],
        page: ["2"],
      }),
    ).toMatchObject({
      search: "Acme",
      page: 2,
    });
  });

  it("parses search, sort, and date bounds", () => {
    expect(
      parsePlatformTenantListParams({
        page: "2",
        pageSize: "25",
        search: " acme ",
        sortBy: "createdAt",
        sortDir: "desc",
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
      }),
    ).toEqual({
      page: 2,
      pageSize: 25,
      search: "acme",
      sortBy: "createdAt",
      sortDir: "desc",
      createdFrom: "2026-01-01",
      createdTo: "2026-01-31",
      modifiedFrom: undefined,
      modifiedTo: undefined,
    });
  });
});

describe("listUrlStateFromSearchParams", () => {
  it("reads the current URL into typed list state", () => {
    const params = new URLSearchParams(
      "search=ash&sortBy=name&sortDir=asc&page=3",
    );

    expect(listUrlStateFromSearchParams(params)).toMatchObject({
      search: "ash",
      sortBy: "name",
      sortDir: "asc",
      page: 3,
      pageSize: 10,
    });
  });
});

describe("tenantsListSuspenseKey", () => {
  it("changes when search changes", () => {
    const base = listUrlStateFromSearchParams(new URLSearchParams("page=1"));
    const searched = listUrlStateFromSearchParams(
      new URLSearchParams("page=1&search=acme"),
    );

    expect(tenantsListSuspenseKey(base)).not.toBe(
      tenantsListSuspenseKey(searched),
    );
  });
});
