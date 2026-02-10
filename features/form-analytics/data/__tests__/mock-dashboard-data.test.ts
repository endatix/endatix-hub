import { describe, expect, it } from "vitest";
import { MOCK_RESULTS, MOCK_SURVEY_JSON } from "../mock-dashboard-data";

describe("mock-dashboard-data", () => {
  it("exports MOCK_SURVEY_JSON with pages and completedHtml", () => {
    expect(MOCK_SURVEY_JSON).toBeDefined();
    expect(MOCK_SURVEY_JSON).toHaveProperty("pages");
    expect(Array.isArray(MOCK_SURVEY_JSON.pages)).toBe(true);
    expect(MOCK_SURVEY_JSON).toHaveProperty("completedHtml");
  });

  it("exports MOCK_RESULTS as non-empty array", () => {
    expect(MOCK_RESULTS).toBeDefined();
    expect(Array.isArray(MOCK_RESULTS)).toBe(true);
    expect(MOCK_RESULTS.length).toBeGreaterThan(0);
    expect(MOCK_RESULTS[0]).toBeTypeOf("object");
  });
});
