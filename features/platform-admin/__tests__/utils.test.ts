import { describe, expect, it } from "vitest";
import { parsePlatformAdminListParams } from "../utils";

describe("parsePlatformAdminListParams", () => {
  it("defaults scope to all and page size to 10", () => {
    expect(parsePlatformAdminListParams()).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      scope: "all",
      tenantId: undefined,
    });
  });

  it("parses scope and tenant filters", () => {
    expect(
      parsePlatformAdminListParams({
        page: "2",
        pageSize: "25",
        search: " admin ",
        scope: "candidates",
        tenantId: "42",
      }),
    ).toEqual({
      page: 2,
      pageSize: 25,
      search: "admin",
      scope: "candidates",
      tenantId: "42",
    });
  });

  it("falls back to all for unknown scope values", () => {
    expect(parsePlatformAdminListParams({ scope: "nominated" }).scope).toBe(
      "all",
    );
  });
});
