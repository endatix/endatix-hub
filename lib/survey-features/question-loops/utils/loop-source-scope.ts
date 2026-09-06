import { Question, QuestionSelectBase } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import { MAX_LOOP_DEPTH } from "../constants";
import { DynamicLoopModel } from "../types";
import { getLoopDepth } from "./collect-loop-questions";
import { stripPanelScope, toPanelScopedName } from "./loop-source-name";
import {
  getOwningDynamicPanel,
  walkOwnQuestions,
  walkTemplateQuestions,
} from "./panel-tree";

/**
 * Which questions a loop may legally use as a source, and how they are written.
 *
 * One rule for every loop, nested or not. The designer previously offered every
 * select question in the survey — including ones that only exist inside an
 * unrelated panel template, which no loop can resolve at runtime, producing a
 * form that looks configured and does nothing (h938).
 *
 *   - siblings in the loop's own panel/template  → `panel.<name>`
 *   - questions in an ancestor scope, page level → `<name>`
 *   - never descendants of this loop
 *   - never questions from an unrelated panel template
 */

type DynamicPanelLike = Question & { templateElements?: Array<unknown> };

/**
 * Only `pages` is needed here, and a question's `survey` is typed as the
 * narrower `ISurvey`. Structural typing keeps both call sites honest without a
 * cast at each one.
 */
type SurveyLike = { pages?: Array<unknown> };

export type LoopSourceCandidate = {
  value: string;
  text: string;
};

function getTemplateScope(container: DynamicPanelLike): unknown {
  return { elements: container.templateElements ?? [] };
}

/** Questions directly in a scope, without descending into dynamic panels. */
function getScopeQuestions(scope: unknown): Question[] {
  return walkOwnQuestions(scope);
}

function getPageLevelQuestions(survey: SurveyLike): Question[] {
  return (survey?.pages ?? []).flatMap((page) => getScopeQuestions(page));
}

/** Every question inside this loop's own template — never a valid source. */
function getDescendantQuestions(loopQuestion: DynamicLoopModel): Set<Question> {
  return new Set(
    walkTemplateQuestions({
      elements: (loopQuestion as DynamicPanelLike).templateElements ?? [],
    }),
  );
}

/**
 * The scopes a loop can read from, innermost first. The first entry is the
 * loop's own panel when it has one, which is the only scope addressed with the
 * `panel.` prefix — SurveyJS resolves that against the immediate panel only.
 */
function getScopeChain(
  loopQuestion: DynamicLoopModel,
  survey: SurveyLike,
): Array<{ questions: Question[]; isOwnPanel: boolean }> {
  const container = getOwningDynamicPanel(loopQuestion);

  if (!container) {
    return [{ questions: getPageLevelQuestions(survey), isOwnPanel: false }];
  }

  const chain = [
    { questions: getScopeQuestions(getTemplateScope(container)), isOwnPanel: true },
  ];

  let ancestor = getOwningDynamicPanel(container);
  while (ancestor) {
    chain.push({
      questions: getScopeQuestions(getTemplateScope(ancestor)),
      isOwnPanel: false,
    });
    ancestor = getOwningDynamicPanel(ancestor);
  }

  chain.push({ questions: getPageLevelQuestions(survey), isOwnPanel: false });
  return chain;
}

/**
 * Source questions this loop may be pointed at, in the form they should be
 * stored. Returns nothing for a loop nested deeper than the depth cap, so the
 * designer cannot configure something the runtime refuses to drive.
 */
export function getLoopSourceCandidates(
  loopQuestion: DynamicLoopModel,
  survey: SurveyLike,
): LoopSourceCandidate[] {
  if (!loopQuestion || !survey || getLoopDepth(loopQuestion) > MAX_LOOP_DEPTH) {
    return [];
  }

  const descendants = getDescendantQuestions(loopQuestion);
  const candidates: LoopSourceCandidate[] = [];
  const seenNames = new Set<string>();

  for (const scope of getScopeChain(loopQuestion, survey)) {
    for (const question of scope.questions) {
      if (question === loopQuestion || descendants.has(question)) continue;
      if (!isSelectBaseQuestion(question)) continue;

      // An outer name shadowed by a nearer one is unaddressable: a bare name
      // always resolves to the innermost match.
      if (seenNames.has(question.name)) continue;
      seenNames.add(question.name);

      candidates.push({
        value: scope.isOwnPanel
          ? toPanelScopedName(question.name)
          : question.name,
        text: question.name,
      });
    }
  }

  return candidates;
}

/**
 * Resolves a stored `loopSource` entry using the same scope rule, for designer
 * code that has no live panel instance to resolve against.
 */
export function resolveLoopSourceInScope(
  loopQuestion: DynamicLoopModel,
  survey: SurveyLike,
  sourceName: string,
): QuestionSelectBase | undefined {
  if (!loopQuestion || !survey || !sourceName) {
    return undefined;
  }

  const bareName = stripPanelScope(sourceName);
  const descendants = getDescendantQuestions(loopQuestion);

  for (const scope of getScopeChain(loopQuestion, survey)) {
    const match = scope.questions.find(
      (question) =>
        question.name === bareName &&
        question !== loopQuestion &&
        !descendants.has(question) &&
        isSelectBaseQuestion(question),
    );

    if (match) {
      return match as QuestionSelectBase;
    }
  }

  return undefined;
}

/** Resolves every stored entry, dropping ones outside the loop's scope. */
export function resolveLoopSourcesInScope(
  loopQuestion: DynamicLoopModel,
  survey: SurveyLike,
): QuestionSelectBase[] {
  const loopSource = loopQuestion?.loopSource;
  if (!Array.isArray(loopSource)) {
    return [];
  }

  return loopSource
    .map((sourceName) =>
      resolveLoopSourceInScope(loopQuestion, survey, sourceName),
    )
    .filter((question): question is QuestionSelectBase => question != null);
}
