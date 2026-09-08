import { PanelModel, Question, SurveyModel } from "survey-core";
import { PANEL_QUESTION_TYPE } from "../constants";

/**
 * Structural navigation of the SurveyJS element tree.
 *
 * `survey.getAllQuestions()` returns page-level questions only, and passing
 * `includeNested: true` still does not return a `paneldynamic` nested inside
 * another one. Everything that has to see loops inside panels walks the tree
 * itself, through these helpers.
 *
 * The nesting primitive is **any** containing `paneldynamic`, not specifically
 * a loop — a loop inside a plain dynamic panel hits the same defects.
 */

/** A container that exposes `elements`: a page, a panel, or a panel instance. */
type ElementContainer = {
  elements?: Array<unknown>;
};

/** The subset of `paneldynamic` this module navigates. */
type DynamicPanelLike = Question & {
  templateElements?: Array<unknown>;
  panels?: PanelModel[];
};

export function isDynamicPanel(value: unknown): value is DynamicPanelLike {
  const question = value as Question | undefined;
  return (
    !!question &&
    typeof question.getType === "function" &&
    question.getType() === PANEL_QUESTION_TYPE
  );
}

function isElementContainer(value: unknown): value is ElementContainer {
  return Array.isArray((value as ElementContainer | undefined)?.elements);
}

function getElements(container: unknown): unknown[] {
  return isElementContainer(container) ? (container.elements ?? []) : [];
}

/**
 * The dynamic panel that owns `question`, if any — one step up the tree.
 * `question.parentQuestion` is set for questions inside a panel instance;
 * the `parent` panel's own `parentQuestion` is the fallback for elements
 * still sitting in a template.
 */
export function getOwningDynamicPanel(
  question: Question,
): DynamicPanelLike | undefined {
  const direct = question?.parentQuestion;
  if (isDynamicPanel(direct)) {
    return direct;
  }

  const owner = (question?.parent as unknown as { parentQuestion?: Question })
    ?.parentQuestion;
  return isDynamicPanel(owner) ? owner : undefined;
}

/**
 * How deeply a question is nested in dynamic panels. A page-level question is
 * depth 0; one inside a single dynamic panel is depth 1.
 */
export function getPanelNestingDepth(question: Question): number {
  let depth = 0;
  let current: Question | undefined = question;

  while (current) {
    const owner = getOwningDynamicPanel(current);
    if (!owner) {
      break;
    }
    depth += 1;
    current = owner;
  }

  return depth;
}

/**
 * Every question reachable from `container` by walking into dynamic panel
 * **templates**. Used for schema-time work (visibility injection), which acts
 * on the declaration shared by all instances.
 */
export function walkTemplateQuestions(container: unknown): Question[] {
  const found: Question[] = [];

  for (const element of getElements(container)) {
    const question = element as Question;
    if (typeof question?.getType !== "function") {
      continue;
    }

    found.push(question);

    if (isDynamicPanel(question)) {
      found.push(
        ...walkTemplateQuestions({ elements: question.templateElements ?? [] }),
      );
      continue;
    }

    // A static panel groups elements without adding a nesting level.
    found.push(...walkTemplateQuestions(question));
  }

  return found;
}

/**
 * Every question reachable from `container` by walking into live panel
 * **instances**. Used at runtime, where each dynamic panel instance owns its
 * own question objects.
 */
export function walkInstanceQuestions(container: unknown): Question[] {
  const found: Question[] = [];

  for (const element of getElements(container)) {
    const question = element as Question;
    if (typeof question?.getType !== "function") {
      continue;
    }

    found.push(question);

    if (isDynamicPanel(question)) {
      for (const panel of question.panels ?? []) {
        found.push(...walkInstanceQuestions(panel));
      }
      continue;
    }

    found.push(...walkInstanceQuestions(question));
  }

  return found;
}

/**
 * Questions belonging to `container` at its own nesting level: dynamic panels
 * are included but not descended into, so a caller that recurses itself does
 * not visit the same loop twice.
 */
export function walkOwnQuestions(container: unknown): Question[] {
  const found: Question[] = [];

  for (const element of getElements(container)) {
    const question = element as Question;
    if (typeof question?.getType !== "function") {
      continue;
    }

    found.push(question);

    if (!isDynamicPanel(question)) {
      // A static panel groups elements without adding a nesting level.
      found.push(...walkOwnQuestions(question));
    }
  }

  return found;
}

/** Template-side questions of a survey, including those inside panel templates. */
export function getAllTemplateQuestions(survey: SurveyModel): Question[] {
  if (!survey) {
    return [];
  }

  return survey.pages.flatMap((page) => walkTemplateQuestions(page));
}

/** Runtime-side questions of a survey, including those inside panel instances. */
export function getAllInstanceQuestions(survey: SurveyModel): Question[] {
  if (!survey) {
    return [];
  }

  return survey.pages.flatMap((page) => walkInstanceQuestions(page));
}
