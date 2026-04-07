import { Model, PageModel, Question } from "survey-core";

export interface SubmissionNavQuestion {
  question: Question;
  name: string;
  title: string;
  isInvisible: boolean;
}

export interface SubmissionNavPage {
  page: PageModel;
  pageName: string;
  pageTitle: string;
  isPageInvisible: boolean;
  questions: SubmissionNavQuestion[];
}

/**
 * Builds the navigation pages for the submission.
 * @param model - The survey model.
 * @param showInvisibleItems - Whether to show invisible items.
 * @returns The navigation pages.
 */
export function buildSubmissionNavPages(
  model: Model | null,
  showInvisibleItems: boolean,
): SubmissionNavPage[] {
  if (!model) {
    return [];
  }

  const pages = model.pages ?? [];

  const result: SubmissionNavPage[] = [];

  for (const page of pages) {
    if (page.isStartPage) {
      continue;
    }

    const isPageInvisible = !page.isVisible;

    if (!showInvisibleItems && isPageInvisible) {
      continue;
    }

    const questions: SubmissionNavQuestion[] = [];

    for (const question of page.questions) {
      const isQuestionInvisible = !question.isVisibleInSurvey;

      if (!showInvisibleItems && isQuestionInvisible) {
        continue;
      }

      questions.push({
        question,
        name: question.name,
        title: question.title || question.name,
        isInvisible: isQuestionInvisible,
      });
    }

    if (questions.length === 0) {
      continue;
    }

    const pageTitle = page.navigationTitle || page.title || page.name;

    result.push({
      page,
      pageName: page.name,
      pageTitle,
      isPageInvisible,
      questions,
    });
  }

  return result;
}

/**
 * Formats the page title for the navigation.
 * @param index - The index of the page.
 * @param title - The title of the page.
 * @returns The formatted page title.
 */
export function formatPageTitle(index: number, title: string): string {
  const AUTO_GENERATED_PAGE_TITLE_REGEX = /^page\d+$/i;

  if (AUTO_GENERATED_PAGE_TITLE_REGEX.test(title)) {
    return title;
  }

  return `Page: ${String(index + 1).padStart(2, "0")}: ${title}`;
}
