import { describe, expect, it, vi } from "vitest";
import {
  Definitions,
  buildListDefinitionsEndpoint,
} from "../../definitions/definitions";
import { ApiResult } from "../../shared/api-result";
import type { EndatixApi } from "../../endatix-api";
import type { FormDefinitionDto } from "../../definitions/types";

const sample: FormDefinitionDto = {
  id: "10",
  formId: "1",
  isDraft: false,
  jsonData: "{}",
  createdAt: new Date(),
};

function pagedResponse(
  items: FormDefinitionDto[],
  overrides: Partial<Record<string, number>> = {},
) {
  const pageSize = overrides.pageSize ?? 10;
  const totalRecords = overrides.totalRecords ?? items.length;
  return {
    items,
    page: overrides.page ?? 1,
    pageSize,
    totalRecords,
    totalPages: overrides.totalPages ?? Math.ceil(totalRecords / pageSize),
  };
}

describe("buildListDefinitionsEndpoint", () => {
  it("applies the default page and page size", () => {
    expect(buildListDefinitionsEndpoint("1")).toBe(
      "/forms/1/definitions?page=1&pageSize=10",
    );
  });

  it("maps sort and calendar bounds onto the wire contract", () => {
    const endpoint = buildListDefinitionsEndpoint("42", {
      page: 2,
      pageSize: 20,
      sortBy: "modifiedAt",
      sortDir: "asc",
      createdFrom: "2024-01-01",
      createdTo: "2024-01-31",
    });

    expect(decodeURIComponent(endpoint)).toBe(
      "/forms/42/definitions?page=2&pageSize=20&sortBy=modifiedAt&sortDir=asc&createdFrom=2024-01-01&createdTo=2024-01-31",
    );
  });
});

describe("Definitions.list", () => {
  it("requests a single page and keeps the paging envelope", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success(
          pagedResponse([sample], { page: 1, pageSize: 10, totalRecords: 11 }),
        ),
      );
    const sut = new Definitions({ get } as unknown as EndatixApi);

    const result = await sut.list("1");

    expect(get).toHaveBeenCalledWith("/forms/1/definitions?page=1&pageSize=10");
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data.items).toEqual([sample]);
      expect(result.data.totalRecords).toBe(11);
      expect(result.data.hasNextPage).toBe(true);
    }
  });

  it("rejects an invalid formId before calling the API", async () => {
    const get = vi.fn();
    const sut = new Definitions({ get } as unknown as EndatixApi);

    const result = await sut.list("not-a-id");

    expect(get).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(false);
  });
});

describe("Definitions.get", () => {
  it("gets a definition by id", async () => {
    const get = vi.fn().mockResolvedValue(ApiResult.success(sample));
    const sut = new Definitions({ get } as unknown as EndatixApi);

    const result = await sut.get("1", "10");

    expect(get).toHaveBeenCalledWith("/forms/1/definitions/10");
    expect(ApiResult.isSuccess(result)).toBe(true);
  });
});
