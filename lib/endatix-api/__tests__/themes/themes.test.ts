import { describe, expect, it, vi } from "vitest";
import { Themes, buildListThemesEndpoint } from "../../themes/themes";
import { ApiResult } from "../../shared/api-result";
import type { EndatixApi } from "../../endatix-api";
import type { Theme } from "../../themes/types";

const sample: Theme = {
  id: "1",
  name: "Brand",
  jsonData: "{}",
  createdAt: new Date(),
};

function pagedResponse(
  items: Theme[],
  overrides: Partial<Record<string, number>> = {},
) {
  const pageSize = overrides.pageSize ?? 20;
  const totalRecords = overrides.totalRecords ?? items.length;
  return {
    items,
    page: overrides.page ?? 1,
    pageSize,
    totalRecords,
    totalPages: overrides.totalPages ?? Math.ceil(totalRecords / pageSize),
  };
}

describe("buildListThemesEndpoint", () => {
  it("applies the default page and page size", () => {
    expect(buildListThemesEndpoint()).toBe("/themes?page=1&pageSize=20");
  });

  it("maps sort and calendar bounds onto the flat wire contract", () => {
    const endpoint = buildListThemesEndpoint({
      page: 3,
      pageSize: 50,
      sortBy: "name",
      sortDir: "asc",
      createdFrom: "2024-01-01",
      createdTo: "2024-01-31",
      modifiedFrom: "2024-02-01",
    });

    expect(decodeURIComponent(endpoint)).toBe(
      "/themes?page=3&pageSize=50&sortBy=name&sortDir=asc&createdFrom=2024-01-01&createdTo=2024-01-31&modifiedFrom=2024-02-01",
    );
  });

  it("drops calendar bounds that are not a valid YYYY-MM-DD day", () => {
    const endpoint = buildListThemesEndpoint({
      createdFrom: "not-a-date",
      createdTo: "2024-02-30",
    });

    expect(endpoint).toBe("/themes?page=1&pageSize=20");
  });
});

describe("Themes.create", () => {
  it("posts to /themes", async () => {
    const body = { name: "Brand", jsonData: "{}" };
    const post = vi.fn().mockResolvedValue(ApiResult.success(sample));
    const sut = new Themes({ post } as unknown as EndatixApi);

    const result = await sut.create(body);

    expect(post).toHaveBeenCalledWith("/themes", body);
    expect(ApiResult.isSuccess(result)).toBe(true);
  });
});

describe("Themes.list", () => {
  it("requests a single page and keeps the paging envelope", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success(
          pagedResponse([sample], { page: 1, pageSize: 20, totalRecords: 21 }),
        ),
      );
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.list();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/themes?page=1&pageSize=20");
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data.items).toEqual([sample]);
      expect(result.data.totalRecords).toBe(21);
      expect(result.data.totalPages).toBe(2);
      expect(result.data.hasNextPage).toBe(true);
    }
  });

  it("honours an explicit page instead of silently returning nothing", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success(
          pagedResponse([sample], { page: 2, pageSize: 20, totalRecords: 21 }),
        ),
      );
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.list({ page: 2 });

    expect(get).toHaveBeenCalledWith("/themes?page=2&pageSize=20");
    if (ApiResult.isSuccess(result)) {
      expect(result.data.page).toBe(2);
      expect(result.data.hasNextPage).toBe(false);
      expect(result.data.items).toEqual([sample]);
    }
  });

  it("normalizes an empty page", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success(pagedResponse([], { totalRecords: 0 })),
      );
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.list();

    if (ApiResult.isSuccess(result)) {
      expect(result.data.items).toEqual([]);
      expect(result.data.totalPages).toBe(0);
      expect(result.data.hasNextPage).toBe(false);
    }
  });

  it("propagates an API error unchanged", async () => {
    const failure = ApiResult.networkError<never>("boom");
    const get = vi.fn().mockResolvedValue(failure);
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.list();

    expect(result).toBe(failure);
  });
});

describe("Themes.listAll", () => {
  it("drains every page and flattens the items", async () => {
    const second: Theme = { ...sample, id: "2", name: "Alt" };
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        ApiResult.success(
          pagedResponse([sample], { page: 1, pageSize: 1, totalRecords: 2 }),
        ),
      )
      .mockResolvedValueOnce(
        ApiResult.success(
          pagedResponse([second], { page: 2, pageSize: 1, totalRecords: 2 }),
        ),
      );
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.listAll({ pageSize: 1 });

    expect(get).toHaveBeenNthCalledWith(1, "/themes?page=1&pageSize=1");
    expect(get).toHaveBeenNthCalledWith(2, "/themes?page=2&pageSize=1");
    expect(get).toHaveBeenCalledTimes(2);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual([sample, second]);
    }
  });

  it("uses the picker page size by default and stops after one page", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success(
          pagedResponse([sample], { page: 1, pageSize: 100, totalRecords: 1 }),
        ),
      );
    const sut = new Themes({ get } as unknown as EndatixApi);

    await sut.listAll();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/themes?page=1&pageSize=100");
  });

  it("stops at the page cap when the server keeps reporting more pages", async () => {
    const get = vi.fn().mockResolvedValue(
      ApiResult.success(
        pagedResponse([sample], {
          page: 1,
          pageSize: 100,
          totalRecords: 1_000_000,
        }),
      ),
    );
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.listAll();

    expect(get).toHaveBeenCalledTimes(50);
    expect(ApiResult.isSuccess(result)).toBe(false);
    if (!ApiResult.isSuccess(result)) {
      expect(result.error.message).toContain("stopped after 50 pages");
    }
  });

  it("short-circuits on the first failing page", async () => {
    const failure = ApiResult.networkError<never>("boom");
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        ApiResult.success(
          pagedResponse([sample], { page: 1, pageSize: 1, totalRecords: 2 }),
        ),
      )
      .mockResolvedValueOnce(failure);
    const sut = new Themes({ get } as unknown as EndatixApi);

    const result = await sut.listAll({ pageSize: 1 });

    expect(get).toHaveBeenCalledTimes(2);
    expect(result).toBe(failure);
  });
});

describe("Themes.partialUpdate / delete", () => {
  it("patches /themes/{id}", async () => {
    const patch = vi.fn().mockResolvedValue(ApiResult.success(sample));
    const sut = new Themes({ patch } as unknown as EndatixApi);

    await sut.partialUpdate("9", { jsonData: "{}" });

    expect(patch).toHaveBeenCalledWith("/themes/9", { jsonData: "{}" });
  });

  it("rejects a malformed theme id before calling the API", async () => {
    const patch = vi.fn();
    const del = vi.fn();
    const sut = new Themes({
      patch,
      delete: del,
    } as unknown as EndatixApi);

    const patched = await sut.partialUpdate("not-an-id", { name: "x" });
    const deleted = await sut.delete("../../admin");

    expect(patch).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(patched)).toBe(false);
    expect(ApiResult.isSuccess(deleted)).toBe(false);
  });

  it("deletes /themes/{id}", async () => {
    const del = vi.fn().mockResolvedValue(ApiResult.success(undefined));
    const sut = new Themes({ delete: del } as unknown as EndatixApi);

    await sut.delete("9");

    expect(del).toHaveBeenCalledWith("/themes/9");
  });
});
