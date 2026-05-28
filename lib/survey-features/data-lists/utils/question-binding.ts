import { DATA_LIST_PROPERTY_NAME } from "../constants";
import {
  forEachSurveyJsonNode,
  forEachSurveyJsonRoot,
} from "./survey-json-walk";

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
