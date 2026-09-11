import { describe, expect, it } from "vitest";
import {
  mapSkipTakeToPage,
  mapSurveyJsLazyLoadTotal,
} from "../choices-lazy-load-page";

describe("mapSkipTakeToPage", () => {
  it("maps skip/take to 1-based Hub paging", () => {
    expect(mapSkipTakeToPage(0, 25)).toEqual({ page: 1, pageSize: 25 });
    expect(mapSkipTakeToPage(25, 25)).toEqual({ page: 2, pageSize: 25 });
  });

  it("uses the default page size when take is not positive", () => {
    expect(mapSkipTakeToPage(0, 0)).toEqual({ page: 1, pageSize: 25 });
  });

  it("clamps negative skip to page 1", () => {
    expect(mapSkipTakeToPage(-10, 25)).toEqual({ page: 1, pageSize: 25 });
  });
});

describe("mapSurveyJsLazyLoadTotal", () => {
  it("keeps an accurate catalog total when it already unlocks page 2", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 25,
        totalRecords: 80,
        hasNextPage: true,
      }),
    ).toBe(80);
  });

  it("bumps a 26-item total so SurveyJS will request skip=25", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 25,
        totalRecords: 26,
        hasNextPage: true,
      }),
    ).toBeGreaterThan(25 + 1);
  });

  it("keeps a gap after a first page that is longer than take (Default + page)", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 26,
        totalRecords: 26,
        hasNextPage: true,
      }),
    ).toBeGreaterThan(25 + 1);
  });

  it("treats a full page with missing total as having more data", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 25,
        totalRecords: 0,
      }),
    ).toBeGreaterThan(25 + 1);
  });

  it("trusts hasNextPage false on an exact full first page", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 25,
        totalRecords: 25,
        hasNextPage: false,
      }),
    ).toBe(25);
  });

  it("uses loaded count on a short last page", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 25,
        take: 25,
        itemCount: 5,
        totalRecords: 30,
        hasNextPage: false,
      }),
    ).toBe(30);
  });
});
