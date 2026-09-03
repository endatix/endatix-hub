import { describe, expect, it } from "vitest";
import { mapSurveyJsLazyLoadTotal } from "../map-surveyjs-lazy-load-total";

describe("mapSurveyJsLazyLoadTotal", () => {
  it("keeps an accurate catalog total when it already unlocks page 2", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 25,
        totalRecords: 40,
        hasNextPage: true,
      }),
    ).toBe(40);
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
    ).toBe(27);
  });

  it("treats a full page with missing total as having more data", () => {
    expect(
      mapSurveyJsLazyLoadTotal({
        skip: 0,
        take: 25,
        itemCount: 25,
        totalRecords: 0,
      }),
    ).toBe(27);
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
