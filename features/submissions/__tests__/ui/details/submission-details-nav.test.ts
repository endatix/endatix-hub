import { Model, PageModel, Question } from "survey-core";
import { describe, expect, it } from "vitest";
import {
  buildSubmissionNavPages,
  formatPageTitle,
} from "../../../ui/details/submission-details-nav";

const createMockPage = (
  name: string,
  isVisible: boolean,
  isStartPage: boolean,
  title: string,
  questions: Question[],
): Partial<PageModel> => ({
  name,
  isVisible,
  isStartPage,
  title,
  navigationTitle: title,
  questions: questions as unknown as PageModel["questions"],
});

const createMockQuestion = (
  name: string,
  title: string,
  isVisibleInSurvey: boolean,
): Partial<Question> => ({
  name,
  title,
  isVisibleInSurvey,
});

const createMockSurvey = (pages: Partial<PageModel>[]): Model => {
  return {
    pages: pages as any,
  } as unknown as Model;
};

describe("submission-details-nav", () => {
  describe("formatPageTitle", () => {
    it("should format page title with 'Page:' prefix and zero-padded index for regular titles", () => {
      expect(formatPageTitle(0, "Personal Info")).toBe(
        "Page: 01: Personal Info",
      );
    });

    it("should handle single digit indices correctly", () => {
      expect(formatPageTitle(4, "Contact Details")).toBe(
        "Page: 05: Contact Details",
      );
    });

    it("should return auto-generated page names as-is (e.g., page1, page2)", () => {
      expect(formatPageTitle(0, "page1")).toBe("page1");
      expect(formatPageTitle(1, "page2")).toBe("page2");
      expect(formatPageTitle(10, "page10")).toBe("page10");
    });

    it("should be case insensitive for auto-generated page names", () => {
      expect(formatPageTitle(0, "PAGE1")).toBe("PAGE1");
      expect(formatPageTitle(0, "Page1")).toBe("Page1");
    });
  });

  describe("buildSubmissionNavPages", () => {
    it("should return empty array when model is null", () => {
      expect(buildSubmissionNavPages(null, true)).toHaveLength(0);
    });

    it("should return empty array when model has no pages", () => {
      const survey = createMockSurvey([]);
      expect(buildSubmissionNavPages(survey, true)).toHaveLength(0);
    });

    it("should skip start pages", () => {
      const pages = [
        createMockPage("page1", true, true, "Start Page", [
          createMockQuestion("q1", "Q1", true) as Question,
        ]),
        createMockPage("page2", true, false, "Regular Page", [
          createMockQuestion("q2", "Q2", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(1);
      expect(result[0].pageName).toBe("page2");
    });

    it("should only include visible pages when showInvisibleItems is false", () => {
      const pages = [
        createMockPage("page1", true, false, "Visible Page", [
          createMockQuestion("q1", "Q1", true) as Question,
        ]),
        createMockPage("page2", false, false, "Invisible Page", [
          createMockQuestion("q2", "Q2", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, false);

      expect(result).toHaveLength(1);
      expect(result[0].pageName).toBe("page1");
      expect(result[0].isPageInvisible).toBe(false);
    });

    it("should include invisible pages when showInvisibleItems is true", () => {
      const pages = [
        createMockPage("page1", true, false, "Visible Page", [
          createMockQuestion("q1", "Q1", true) as Question,
        ]),
        createMockPage("page2", false, false, "Invisible Page", [
          createMockQuestion("q2", "Q2", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(2);
      expect(result[0].pageName).toBe("page1");
      expect(result[0].isPageInvisible).toBe(false);
      expect(result[1].pageName).toBe("page2");
      expect(result[1].isPageInvisible).toBe(true);
    });

    it("should only include visible questions when showInvisibleItems is false", () => {
      const pages = [
        createMockPage("page1", true, false, "Page 1", [
          createMockQuestion("q1", "Question 1", true) as Question,
          createMockQuestion("q2", "Question 2", false) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, false);

      expect(result).toHaveLength(1);
      expect(result[0].questions).toHaveLength(1);
      expect(result[0].questions[0].name).toBe("q1");
      expect(result[0].questions[0].isInvisible).toBe(false);
    });

    it("should include invisible questions when showInvisibleItems is true", () => {
      const pages = [
        createMockPage("page1", true, false, "Page 1", [
          createMockQuestion("q1", "Question 1", true) as Question,
          createMockQuestion("q2", "Question 2", false) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(1);
      expect(result[0].questions).toHaveLength(2);
      expect(result[0].questions[0].isInvisible).toBe(false);
      expect(result[0].questions[1].isInvisible).toBe(true);
    });

    it("should omit pages with no included questions", () => {
      const pages = [
        createMockPage(
          "page1",
          false,
          false,
          "Invisible Page With Invisible Questions",
          [createMockQuestion("q1", "Question 1", false) as Question],
        ),
        createMockPage("page2", true, false, "Visible Page", [
          createMockQuestion("q2", "Question 2", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, false);

      expect(result).toHaveLength(1);
      expect(result[0].pageName).toBe("page2");
    });

    it("should use navigationTitle as page title when available", () => {
      const pages = [
        createMockPage("page1", true, false, "Fallback Title", [
          createMockQuestion("q1", "Q1", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(1);
      expect(result[0].pageTitle).toBe("Fallback Title");
    });

    it("should use page title when navigationTitle is not available", () => {
      const pages = [
        createMockPage("page1", true, false, "Page Title", [
          createMockQuestion("q1", "Q1", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(1);
      expect(result[0].pageTitle).toBe("Page Title");
    });

    it("should handle question with no title by using name", () => {
      const pages = [
        createMockPage("page1", true, false, "Page 1", [
          createMockQuestion("q1", "", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(1);
      expect(result[0].questions[0].title).toBe("q1");
    });

    it("should preserve page order from model", () => {
      const pages = [
        createMockPage("page3", true, false, "Third", [
          createMockQuestion("q3", "Q3", true) as Question,
        ]),
        createMockPage("page1", true, false, "First", [
          createMockQuestion("q1", "Q1", true) as Question,
        ]),
        createMockPage("page2", true, false, "Second", [
          createMockQuestion("q2", "Q2", true) as Question,
        ]),
      ];
      const survey = createMockSurvey(pages);

      const result = buildSubmissionNavPages(survey, true);

      expect(result).toHaveLength(3);
      expect(result[0].pageName).toBe("page3");
      expect(result[1].pageName).toBe("page1");
      expect(result[2].pageName).toBe("page2");
    });
  });
});
