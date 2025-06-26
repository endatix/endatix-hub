import { Question, PanelModel } from "survey-core";

/**
 * Get the title of the panel that contains the question
 * @param question - The question to get the panel title for
 * @returns The title of the panel that contains the question
 */
export function getPanelTitle(question: Question): string {
  const panel = question.parent;

  if (panel instanceof PanelModel) {
    return panel.processedTitle ?? panel.title;
  }

  if (panel.isPage) {
    return panel.shortcutText ?? "";
  }

  return "";
}
