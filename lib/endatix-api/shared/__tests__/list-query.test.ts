import { describe, expect, it } from "vitest";
import {
  appendDateRangeFilters,
  appendSortParams,
  parseCalendarDateYmd,
  parseSortBy,
  parseSortDir,
  pickDateRangeFilters,
} from "../list-query";

describe("parseCalendarDateYmd", () => {
  it("accepts real UTC calendar days including year 0001", () => {
    expect(parseCalendarDateYmd("2024-01-31")).toBe("2024-01-31");
    expect(parseCalendarDateYmd("0001-01-01")).toBe("0001-01-01");
    expect(parseCalendarDateYmd(" 2024-06-01 ")).toBe("2024-06-01");
  });

  it("rejects overflow dates, wrong shape, and empty", () => {
    expect(parseCalendarDateYmd("2024-02-30")).toBeUndefined();
    expect(parseCalendarDateYmd("2024-13-01")).toBeUndefined();
    expect(parseCalendarDateYmd("01-01-2024")).toBeUndefined();
    expect(parseCalendarDateYmd("")).toBeUndefined();
    expect(parseCalendarDateYmd(null)).toBeUndefined();
    expect(parseCalendarDateYmd(undefined)).toBeUndefined();
  });
});

describe("parseSortDir", () => {
  it("accepts asc and desc case-insensitively", () => {
    expect(parseSortDir("asc")).toBe("asc");
    expect(parseSortDir("DESC")).toBe("desc");
  });

  it("rejects unknown values", () => {
    expect(parseSortDir("up")).toBeUndefined();
    expect(parseSortDir("")).toBeUndefined();
  });
});

describe("parseSortBy", () => {
  const allowed = new Set(["name", "createdAt"] as const);

  it("accepts allowlisted fields", () => {
    expect(parseSortBy("name", allowed)).toBe("name");
    expect(parseSortBy("createdAt", allowed)).toBe("createdAt");
  });

  it("drops unknown fields", () => {
    expect(parseSortBy("email", allowed)).toBeUndefined();
    expect(parseSortBy("", allowed)).toBeUndefined();
  });
});

describe("pickDateRangeFilters", () => {
  it("extracts created and modified From/To via getter", () => {
    const values: Record<string, string> = {
      createdFrom: "2024-01-01",
      createdTo: "2024-01-31",
      modifiedFrom: "2024-02-01",
      modifiedTo: "not-a-date",
    };

    const result = pickDateRangeFilters((key) => values[key], [
      "created",
      "modified",
    ] as const);

    expect(result).toEqual({
      createdFrom: "2024-01-01",
      createdTo: "2024-01-31",
      modifiedFrom: "2024-02-01",
      modifiedTo: undefined,
    });
  });
});

describe("appendSortParams", () => {
  it("appends sortBy and sortDir when present", () => {
    const params = new URLSearchParams();
    appendSortParams(params, { sortBy: "name", sortDir: "asc" });
    expect(params.get("sortBy")).toBe("name");
    expect(params.get("sortDir")).toBe("asc");
  });
});

describe("appendDateRangeFilters", () => {
  it("appends valid YMD bounds and skips invalid", () => {
    const params = new URLSearchParams();
    appendDateRangeFilters(
      params,
      {
        createdFrom: "2024-01-01",
        createdTo: "2024-13-01",
        modifiedFrom: "2024-02-01",
      },
      ["created", "modified"],
    );

    expect(params.get("createdFrom")).toBe("2024-01-01");
    expect(params.has("createdTo")).toBe(false);
    expect(params.get("modifiedFrom")).toBe("2024-02-01");
  });
});
