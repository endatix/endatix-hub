import { PanelModel, Question, QuestionSelectBase, SurveyModel } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import { DynamicLoopModel } from "../types";
import {
  isPanelScopedName,
  stripPanelScope,
  toPanelScopedName,
} from "./loop-source-name";

/**
 * Scope-aware resolution of a loop's source question.
 *
 * `survey.getQuestionByName` only knows page-level questions, and there is one
 * copy of a template question per panel instance, so a global lookup is both
 * incomplete and ambiguous. Resolution instead goes through the question's own
 * `data` — the `QuestionPanelDynamicItem` for a question inside a panel — which
 * is the same mechanism SurveyJS carry-forward uses for `choicesFromQuestion`.
 *
 * Order (innermost scope wins):
 *   1. `panel.`-prefixed name → the containing panel instance, as stored;
 *   2. bare name → the containing panel instance;
 *   3. bare name → ancestor panel instances, nearest first;
 *   4. bare name → the survey root.
 */

type ResolutionData = {
  findQuestionByName?: (name: string) => Question | undefined | null;
};

function getResolutionData(loopQuestion: Question): ResolutionData | undefined {
  const question = loopQuestion as Question & {
    data?: ResolutionData;
    survey?: SurveyModel;
  };

  return (
    question?.data ??
    (question?.parentQuestion as Question & { data?: ResolutionData })?.data ??
    (question?.survey as unknown as ResolutionData | undefined)
  );
}

function findVia(
  data: ResolutionData | undefined,
  name: string,
): Question | undefined {
  return data?.findQuestionByName?.(name) ?? undefined;
}

/**
 * Ancestor panel instances above the question's immediate one, nearest first.
 * `data.findQuestionByName` only covers the immediate panel and the survey, so
 * this is what lets a depth-2 loop read a source from the panel above it.
 */
function getAncestorPanels(loopQuestion: Question): PanelModel[] {
  const panels: PanelModel[] = [];
  let current: Question | undefined = loopQuestion;

  while (current) {
    const panel = current.parent as unknown as PanelModel | undefined;
    if (!panel) {
      break;
    }

    panels.push(panel);
    current = (panel as unknown as { parentQuestion?: Question }).parentQuestion;
  }

  // The immediate panel is already covered by `data.findQuestionByName`.
  return panels.slice(1);
}

/** Resolves one `loopSource` entry against the loop's own scope. */
export function resolveLoopSource(
  loopQuestion: Question,
  sourceName: string,
): Question | undefined {
  if (!loopQuestion || !sourceName) {
    return undefined;
  }

  const data = getResolutionData(loopQuestion);

  if (isPanelScopedName(sourceName)) {
    return findVia(data, sourceName);
  }

  const inOwnPanel = findVia(data, toPanelScopedName(sourceName));
  if (inOwnPanel) {
    return inOwnPanel;
  }

  for (const panel of getAncestorPanels(loopQuestion)) {
    const inAncestor = panel?.getQuestionByName?.(sourceName);
    if (inAncestor) {
      return inAncestor;
    }
  }

  return findVia(data, stripPanelScope(sourceName));
}

/**
 * Resolves every `loopSource` entry of a loop to a select-base question,
 * dropping entries that cannot be resolved in this scope.
 */
export function resolveLoopSourceQuestions(
  loopQuestion: DynamicLoopModel,
): QuestionSelectBase[] {
  const loopSource = loopQuestion?.loopSource;
  if (!Array.isArray(loopSource)) {
    return [];
  }

  return loopSource
    .map((sourceName) => resolveLoopSource(loopQuestion, sourceName))
    .filter((question): question is Question => question != null)
    .filter(isSelectBaseQuestion);
}
