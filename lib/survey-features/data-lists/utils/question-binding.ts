import type { Question } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import {
  forEachSurveyJsonNode,
  forEachSurveyJsonRoot,
} from "./survey-json-walk";

/**
 * Binds a data list to a live survey question (Creator / runtime model).
 */
export function applyDataListBindingOnQuestion(
  question: Question,
  dataListId: string,
): void {
  question.setPropertyValue(DATA_LIST_PROPERTY_NAME, dataListId);
  question.setPropertyValue("choicesLazyLoadEnabled", true);
  question.setPropertyValue("choices", []);
}

/**
 * Applies a data list binding to a question JSON node.
 */
export function applyDataListBindingToQuestionJson(
  questionJson: Record<string, unknown>,
  dataListId: string,
): void {
  questionJson[DATA_LIST_PROPERTY_NAME] = dataListId;
  questionJson.choices = [];
  questionJson.choicesLazyLoadEnabled = true;
}

/**
 * Walks survey JSON and applies binding to the first question with a matching name.
 */
export function applyDataListBindingByQuestionName(
  surveyJson: Record<string, unknown>,
  questionName: string,
  dataListId: string,
): boolean {
  let applied = false;

  forEachSurveyJsonRoot(surveyJson, (root) => {
    forEachSurveyJsonNode(root, (node) => {
      if (applied) {
        return;
      }
      if (
        typeof node.name === "string" &&
        node.name === questionName &&
        (node.type === "dropdown" || node.type === "tagbox")
      ) {
        applyDataListBindingToQuestionJson(node, dataListId);
        applied = true;
      }
    });
  });

  return applied;
}
