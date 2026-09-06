import { PanelModel, Question, SurveyModel } from "survey-core";
import { MAX_LOOP_DEPTH, PANEL_QUESTION_TYPE } from "../constants";
import { DynamicLoopModel } from "../types";
import {
  getAllInstanceQuestions,
  getAllTemplateQuestions,
  getPanelNestingDepth,
  isDynamicPanel,
  walkOwnQuestions,
} from "./panel-tree";

/**
 * Discovery of loop questions, split by intent.
 *
 * Template-level discovery finds loop *declarations* (including inside panel
 * templates) and is what schema-time work acts on. Instance-level discovery
 * finds live loop *objects*, one per containing panel instance, and is what
 * runtime sync acts on. The two diverge the moment a loop sits inside a panel,
 * so they are deliberately separate functions.
 */

/** True when the question is a `paneldynamic` configured as a loop. */
export function isLoopQuestion(
  question: Question | undefined | null,
): question is DynamicLoopModel {
  if (question?.getType?.() !== PANEL_QUESTION_TYPE) {
    return false;
  }

  const loopSource = (question as DynamicLoopModel).loopSource;
  return Array.isArray(loopSource) && loopSource.length > 0;
}

/**
 * Whether this loop is nested deeply enough that we refuse to drive it.
 * A page-level loop is depth 1.
 */
export function getLoopDepth(loopQuestion: Question): number {
  return getPanelNestingDepth(loopQuestion) + 1;
}

export function isWithinDepthLimit(loopQuestion: Question): boolean {
  return getLoopDepth(loopQuestion) <= MAX_LOOP_DEPTH;
}

/** Every loop declaration in the survey, including inside panel templates. */
export function collectLoopTemplates(survey: SurveyModel): DynamicLoopModel[] {
  return getAllTemplateQuestions(survey).filter(isLoopQuestion);
}

/** Every live loop instance in the survey, including inside panel instances. */
export function collectLoopInstances(survey: SurveyModel): DynamicLoopModel[] {
  return getAllInstanceQuestions(survey).filter(isLoopQuestion);
}

/**
 * Loops a cascade should drive from this container.
 *
 * A **loop** is a cascade node: it is returned, and the caller recurses into the
 * panels it produces. A **plain** dynamic panel is a pass-through: it produces
 * no loop of its own, but loops live inside its panels and nothing else will
 * reach them, so descent continues through it.
 *
 * Deeper loops below a cascade node are deliberately not returned — the caller
 * reaches those by recursing, and returning them here would sync them twice.
 */
export function collectCascadeLoops(container: unknown): DynamicLoopModel[] {
  if (!container) {
    return [];
  }

  const found: DynamicLoopModel[] = [];

  for (const question of walkOwnQuestions(container)) {
    if (isLoopQuestion(question)) {
      found.push(question);
      continue;
    }

    if (isDynamicPanel(question)) {
      for (const panel of question.panels ?? []) {
        found.push(...collectCascadeLoops(panel));
      }
    }
  }

  return found;
}

/** Loops a cascade should drive from one panel instance. */
export function collectLoopsInPanel(panel: PanelModel): DynamicLoopModel[] {
  return collectCascadeLoops(panel);
}

/**
 * Loop instances that are roots for a sync cascade: those not contained by
 * another **loop**. A loop inside a plain dynamic panel is a root, because no
 * cascade descends from a panel that is not itself a loop — miss that and it
 * never hydrates from saved data.
 *
 * Syncing these depth-first reaches every loop in the survey, because a loop
 * below a cascade node only exists once that node has panels.
 */
export function collectRootLoopInstances(
  survey: SurveyModel,
): DynamicLoopModel[] {
  if (!survey) {
    return [];
  }

  return (survey.pages ?? []).flatMap((page) => collectCascadeLoops(page));
}
