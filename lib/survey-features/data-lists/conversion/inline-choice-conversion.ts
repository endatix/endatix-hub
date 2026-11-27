import type { Question } from "survey-core";
import {
  hasDynamicChoiceSources,
  hasDynamicChoiceSourcesInJson,
} from "../utils/choice-sources";
import { resolveLocalizedText } from "../utils/survey-localized-text";
import {
  forEachSurveyJsonNode,
  forEachSurveyJsonRoot,
  parseSurveyJsonRoot,
} from "../utils/survey-json-walk";

export interface ConvertibleChoiceQuestionRef {
  name: string;
  type: "dropdown" | "tagbox";
  choiceCount: number;
  choiceBytes: number;
  title: string;
}

function choiceMetrics(choices: unknown[]) {
  return { choiceCount: choices.length, choiceBytes: new TextEncoder().encode(JSON.stringify(choices)).length };
}

function collectConvertibleChoiceQuestions(
  node: unknown,
  out: ConvertibleChoiceQuestionRef[],
  threshold: number | undefined,
): void {
  forEachSurveyJsonNode(node, (element) => {
    const qType = element.type;
    if (
      (qType !== "dropdown" && qType !== "tagbox") ||
      typeof element.name !== "string"
    ) {
      return;
    }

    if (hasDynamicChoiceSourcesInJson(element)) {
      return;
    }

    const choices = Array.isArray(element.choices) ? element.choices : [];
    const count = choices.length;
    if (count < Math.max(1, threshold ?? 1)) return;

    out.push({
      name: element.name,
      type: qType,
      ...choiceMetrics(choices),
      title: resolveLocalizedText(element.title) || element.name || qType,
    });
  });
}

/**
 * Checks if a question has inline choices suitable for data list conversion.
 */
export function isInlineChoicesQuestion(q: Question): boolean {
  const t = q.getType();
  if (t !== "dropdown" && t !== "tagbox") {
    return false;
  }
  if (hasDynamicChoiceSources(q)) {
    return false;
  }
  return q.choices.length > 0;
}

/**
 * Finds dropdown/tagbox questions with inline choices in survey JSON.
 */
export function findConvertibleChoiceQuestions(
  json: string | object,
  threshold?: number,
): ConvertibleChoiceQuestionRef[] {
  const surveyJson = parseSurveyJsonRoot(json);
  if (!surveyJson) {
    return [];
  }

  const out: ConvertibleChoiceQuestionRef[] = [];
  forEachSurveyJsonRoot(surveyJson, (root) => {
    collectConvertibleChoiceQuestions(root, out, threshold);
  });
  return out;
}
