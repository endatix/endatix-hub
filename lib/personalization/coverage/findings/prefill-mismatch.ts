import { Model, type Question } from "survey-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import {
  isPrefillCompatible,
  prefillSourceNamed,
  prefillShapeOf,
  prefillSources,
  prefillVariableOf,
  type PrefillShape,
} from "../prefill-match";
import type { AudienceFinding } from "./types";

type Located = {
  name: string;
  shape: PrefillShape;
  expression: string;
  path: string;
};

function indexIn(list: unknown[] | undefined, item: unknown): number {
  if (!list) return -1;
  return list.indexOf(item);
}

type Parent = {
  getType?: () => string;
  parent?: Parent;
  pages?: unknown[];
  elements?: unknown[];
  templateElements?: unknown[];
};

/**
 * `pages[0].elements[1].defaultValueExpression`, the path a canvas fix sets. A page built from
 * JSON has no `parent`, so the page index is read from the survey that owns the question.
 */
function expressionPath(question: Question): string | undefined {
  const survey = question.survey as Parent | null;
  const segments: string[] = [];
  let current: Parent = question;
  while (current !== survey) {
    const parent = current.parent;
    if (!parent) {
      if (current.getType?.() !== "page") return undefined;
      const pageIndex = indexIn(survey?.pages, current);
      if (pageIndex < 0) return undefined;
      segments.unshift(`pages[${pageIndex}]`);
      break;
    }
    const elementIndex = indexIn(parent.elements, current);
    if (elementIndex >= 0) {
      segments.unshift(`elements[${elementIndex}]`);
      current = parent;
      continue;
    }
    const templateIndex = indexIn(parent.templateElements, current);
    if (templateIndex >= 0) {
      segments.unshift(`templateElements[${templateIndex}]`);
      current = parent;
      continue;
    }
    return undefined;
  }
  if (segments.length === 0) return undefined;
  return `${segments.join(".")}.defaultValueExpression`;
}

function located(question: Question, path: string | undefined): Located[] {
  const expression = question.defaultValueExpression;
  if (typeof expression !== "string" || !path) return [];
  const shape = prefillShapeOf(question);
  return [{ name: question.name, shape, expression, path }];
}

/**
 * A dynamic panel's saved template, by its `templateElements` path. `getAllQuestions()` leaves
 * template questions out, and the panels it builds from them are not what the JSON stores.
 */
function templateQuestions(question: Question, at: string): Located[] {
  const template = (question as Question & { templateElements?: unknown[] })
    .templateElements;
  if (question.getType() !== "paneldynamic" || !Array.isArray(template))
    return [];
  return template.flatMap((element, index) => {
    if (!(element instanceof Object) || !("defaultValueExpression" in element))
      return [];
    const inner = element as Question;
    const path = `${at}.templateElements[${index}]`;
    return [
      ...located(inner, `${path}.defaultValueExpression`),
      ...templateQuestions(inner, path),
    ];
  });
}

function locatedQuestions(surveyJson: object): Located[] {
  const model = new Model(surveyJson);
  try {
    return model.getAllQuestions().flatMap((question) => {
      const path = expressionPath(question);
      const at = path?.replace(/\.defaultValueExpression$/, "");
      return [
        ...located(question, path),
        ...(at ? templateQuestions(question, at) : []),
      ];
    });
  } finally {
    model.dispose();
  }
}

/**
 * A `{var}` or `edxLocalDateTime({var})` prefill whose question is not one of the Property's
 * `prefillTargets`. A calculation is not a prefill. The fix clears the expression and leaves
 * `readOnly`. No warning when the API did not send `prefillTargets`.
 */
export function prefillTypeMismatches(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceFinding[] {
  const sources = prefillSources(variables);
  if (sources.length === 0) return [];
  return locatedQuestions(surveyJson).flatMap((question) => {
    const variable = prefillVariableOf(question.expression.trim());
    if (!variable) return [];
    const source = prefillSourceNamed(sources, variable);
    if (!source || !Array.isArray(source.prefillTargets)) return [];
    if (isPrefillCompatible(question.shape, source.prefillTargets)) return [];
    const fix = {
      reason: "clearPrefill",
      edits: [{ op: "set" as const, path: question.path, value: undefined }],
    };
    return [
      {
        kind: "prefill-type-mismatch" as const,
        variable: source.variable,
        propertyTitle: source.title,
        path: question.path,
        elementName: question.name,
        fix,
      },
    ];
  });
}
