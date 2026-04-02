import { Model, PageModel, Question } from "survey-core";
import { describe, expect, it, vi } from "vitest";
import {
  buildTocItemsFromActions,
  formatPageTitle,
  getTocQuestionsVisibleOnPage,
} from "../../../ui/details/submission-toc";

const createMockPage = (
  name: string,
  isVisible: boolean,
  isStartPage: boolean,
  navigationTitle: string,
  questions: Question[],
): Partial<PageModel> => ({
  name,
  isVisible,
  isStartPage,
  locNavigationTitle: {
    rawValue: navigationTitle,
    get: () => navigationTitle,
  } as any,
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
  const survey = {
    pages: pages as any,
    getPageByName: vi.fn(
      (name: string) => pages.find((p) => p.name === name) || null,
    ),
  } as unknown as Model;
  return survey;
};

const createMockAction = (
  id: string,
  title: string,
  isVisible: boolean,
): { id: string; title: string; isVisible: boolean; dispose: () => void } => ({
  id,
  title,
  isVisible,
  dispose: vi.fn(),
});

describe("submission-toc", () => {
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

  describe("getTocQuestionsVisibleOnPage", () => {
    it("should return only questions visible in survey", () => {
      const questions = [
        createMockQuestion("q1", "Question 1", true),
        createMockQuestion("q2", "Question 2", false),
        createMockQuestion("q3", "Question 3", true),
      ];
      const page = createMockPage(
        "page1",
        true,
        false,
        "Page 1",
        questions as any,
      );

      const result = getTocQuestionsVisibleOnPage(page as PageModel);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("q1");
      expect(result[1].name).toBe("q3");
    });

    it("should return empty array when no questions are visible", () => {
      const questions = [
        createMockQuestion("q1", "Question 1", false),
        createMockQuestion("q2", "Question 2", false),
      ];
      const page = createMockPage(
        "page1",
        true,
        false,
        "Page 1",
        questions as any,
      );

      const result = getTocQuestionsVisibleOnPage(page as PageModel);

      expect(result).toHaveLength(0);
    });

    it("should return empty array for empty page", () => {
      const page = createMockPage("page1", true, false, "Page 1", []);

      const result = getTocQuestionsVisibleOnPage(page as PageModel);

      expect(result).toHaveLength(0);
    });
  });

  describe("buildTocItemsFromActions", () => {
    it("should return empty array for empty actions", () => {
      const survey = createMockSurvey([]);
      const result = buildTocItemsFromActions(survey, []);
      expect(result).toHaveLength(0);
    });

    it("should filter out invisible actions", () => {
      const visibleAction = createMockAction("page1", "Page 1", true);
      const invisibleAction = createMockAction("page2", "Page 2", false);

      const pages = [createMockPage("page1", true, false, "Page 1", [])];
      const survey = createMockSurvey(pages);

      const result = buildTocItemsFromActions(survey, [
        visibleAction as any,
        invisibleAction as any,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("page1");
    });

    it("should skip pages that don't exist in survey", () => {
      const action = createMockAction("nonexistent", "Missing", true);

      const survey = createMockSurvey([]);

      const result = buildTocItemsFromActions(survey, [action as any]);

      expect(result).toHaveLength(0);
    });

    it("should build ToC items with page name, title, and questions", () => {
      const questions = [
        createMockQuestion("q1", "Question 1", true),
        createMockQuestion("q2", "Question 2", true),
      ];
      const page = createMockPage(
        "page1",
        true,
        false,
        "Personal Info",
        questions as unknown as Question[],
      );
      const action = createMockAction("page1", "Personal Info", true);

      const survey = createMockSurvey([page]);

      const result = buildTocItemsFromActions(survey, [action as any]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("page1");
      expect(result[0].title).toBe("Personal Info");
      expect(result[0].questions).toHaveLength(2);
      expect(result[0].questions[0].name).toBe("q1");
      expect(result[0].questions[0].title).toBe("Question 1");
    });

    it("should use question name as title when title is empty", () => {
      const questions = [createMockQuestion("q1", "", true)];
      const page = createMockPage("page1", true, false, "Page 1", questions as any as Question[]);
      const action = createMockAction("page1", "Page 1", true);

      const survey = createMockSurvey([page]);

      const result = buildTocItemsFromActions(survey, [action as any]);

      expect(result[0].questions[0].title).toBe("q1");
    });
  });
});
