import { describe, expect, it } from "vitest";
import { PagedResponse } from "../types";
import { normalizePagedResponse } from "../paged-response";

describe("normalizePagedItemsResponse", () => {
  it("normalizes string page and pageSize to numbers", () => {
    const response: PagedResponse<string> = {
      page: 2,
      pageSize: 10,
      totalRecords: 50,
      totalPages: 5,
      items: ["a", "b"],
    };

    const result = normalizePagedResponse(response);

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalRecords).toBe(50);
    expect(result.totalPages).toBe(5);
    expect(result.items).toEqual(["a", "b"]);
    expect(result.hasNextPage).toBe(true);
  });

  it("handles number inputs directly", () => {
    const response: PagedResponse<string> = {
      page: 5,
      pageSize: 20,
      totalRecords: 100,
      totalPages: 5,
      items: ["x"],
    };

    const result = normalizePagedResponse(response);

    expect(result.page).toBe(5);
    expect(result.pageSize).toBe(20);
    expect(result.totalRecords).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasNextPage).toBe(false);
  });

  it("falls back to defaults for undefined values", () => {
    const response: PagedResponse<string> = {
      page: 1,
      pageSize: 3,
      totalRecords: 3,
      totalPages: 1,
      items: ["a", "b", "c"],
    };

    const result = normalizePagedResponse(response);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
    expect(result.totalRecords).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it("calculates totalPages from totalRecords when not provided", () => {
    const response: PagedResponse<string> = {
      page: 2,
      pageSize: 10,
      totalRecords: 35,
      totalPages: 0,
      items: [],
    };

    const result = normalizePagedResponse(response);

    expect(result.totalPages).toBe(4);
    expect(result.hasNextPage).toBe(true);
  });

  it("infers total records and pages from visible items when API totals are zero", () => {
    const result = normalizePagedResponse({
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
      items: ["Admin", "Creator", "Reviewer", "Scripter"],
    });

    expect(result.totalRecords).toBe(4);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it("infers minimum total records for later pages", () => {
    const result = normalizePagedResponse({
      page: 2,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
      items: ["Reviewer", "Scripter"],
    });

    expect(result.totalRecords).toBe(12);
    expect(result.totalPages).toBe(2);
    expect(result.hasNextPage).toBe(false);
  });

  it("keeps reported totals when they exceed visible records", () => {
    const result = normalizePagedResponse({
      page: 1,
      pageSize: 10,
      totalRecords: 42,
      totalPages: 5,
      items: ["Admin", "Creator"],
    });

    expect(result.totalRecords).toBe(42);
    expect(result.totalPages).toBe(5);
    expect(result.hasNextPage).toBe(true);
  });

  it("handles zero totalRecords returns zero pages", () => {
    const response: PagedResponse<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
      items: [],
    };

    const result = normalizePagedResponse(response);

    expect(result.totalRecords).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
  });

  it("handles negative input values with fallback", () => {
    const response: PagedResponse<string> = {
      page: -1,
      pageSize: -5,
      totalRecords: -10,
      totalPages: -1,
      items: ["a"],
    };

    const result = normalizePagedResponse(response);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalRecords).toBe(0);
  });

  it("handles Infinity values with fallback", () => {
    const response: PagedResponse<string> = {
      page: Infinity,
      pageSize: Infinity,
      totalRecords: Infinity,
      totalPages: Infinity,
      items: ["a"],
    };

    const result = normalizePagedResponse(response);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalRecords).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("calculates hasNextPage correctly when items exist", () => {
    const response: PagedResponse<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 25,
      totalPages: 3,
      items: ["a", "b", "c"],
    };

    const result = normalizePagedResponse(response);

    expect(result.hasNextPage).toBe(true);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it("returns items from response", () => {
    const response: PagedResponse<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 3,
      totalPages: 1,
      items: ["a", "b", "c"],
    };

    const result = normalizePagedResponse(response);

    expect(result.items).toEqual(["a", "b", "c"]);
  });

  it("enforces minimum page of 1", () => {
    const response: PagedResponse<string> = {
      page: 0,
      pageSize: 10,
      totalRecords: 100,
      totalPages: 10,
      items: [],
    };

    const result = normalizePagedResponse(response);

    expect(result.page).toBe(1);
  });

  it("enforces minimum pageSize of 1", () => {
    const response: PagedResponse<string> = {
      page: 1,
      pageSize: -5,
      totalRecords: 100,
      totalPages: 10,
      items: ["a"],
    };

    const result = normalizePagedResponse(response);

    expect(result.pageSize).toBe(1);
  });

  it("handles empty response with zero totalRecords and totalPages", () => {
    const response: PagedResponse<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
      items: [],
    };

    const result = normalizePagedResponse(response);

    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
  });

  it("handles last page correctly", () => {
    const response: PagedResponse<string> = {
      page: 5,
      pageSize: 10,
      totalRecords: 50,
      totalPages: 5,
      items: [],
    };

    const result = normalizePagedResponse(response);

    expect(result.hasNextPage).toBe(false);
    expect(result.page).toBe(5);
    expect(result.totalPages).toBe(5);
  });

  it("handles null/undefined response", () => {
    const result = normalizePagedResponse(
      null as unknown as PagedResponse<string>,
    );
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toEqual([]);
    expect(result.hasNextPage).toBe(false);
  });
});
