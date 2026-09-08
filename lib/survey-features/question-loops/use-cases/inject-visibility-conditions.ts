import { IElement, SurveyModel } from "survey-core";
import { PANEL_VISIBILITY_SENTINEL } from "../dynamic-loop-question";
import {
  collectLoopInstances,
  collectLoopTemplates,
} from "../utils/collect-loop-questions";
import { DynamicLoopModel, LOOP_EXIT_FUNCTION_NAME } from "../types";
import { hasProperty } from "@/lib/utils/type-validators";

function injectTemplateLevelCondition(element: DynamicLoopModel): void {
  const templateVisibleIf = String(element.templateVisibleIf ?? "");

  if (templateVisibleIf.includes(LOOP_EXIT_FUNCTION_NAME)) return;

  const isConditionEmpty =
    templateVisibleIf.length === 0 || templateVisibleIf.trim().length === 0;
  const templateVisibleCondition = `${LOOP_EXIT_FUNCTION_NAME}('${element.name}', {panelIndex}, ${PANEL_VISIBILITY_SENTINEL}) = false`;

  element.templateVisibleIf = isConditionEmpty
    ? templateVisibleCondition
    : `(${templateVisibleIf}) and ${templateVisibleCondition}`;
}

function injectElementLevelCondition(
  element: IElement,
  panelName: string,
  elementIndex: number,
): void {
  const hasVisibleIf = hasProperty(element, "visibleIf");
  if (!hasVisibleIf) return;

  const elementVisibleIf = String(element.visibleIf ?? "");
  if (!element.visible && elementVisibleIf.length === 0) return;

  if (elementVisibleIf.includes(LOOP_EXIT_FUNCTION_NAME)) return;

  const isConditionEmpty =
    elementVisibleIf.length === 0 || elementVisibleIf.trim().length === 0;
  const elementVisibleCondition = `${LOOP_EXIT_FUNCTION_NAME}('${panelName}', {panelIndex}, ${elementIndex}) = false`;

  element.visibleIf = isConditionEmpty
    ? elementVisibleCondition
    : `(${elementVisibleIf}) and ${elementVisibleCondition}`;
}

/**
 * Copies the injected conditions onto panels that already exist.
 *
 * Mutating `templateElements` only reaches instances created afterwards. When
 * the model is bound to data that is already loaded — a resumed submission, or
 * prefilled defaults — the panels were built before injection ran, so their
 * questions would keep an uninjected `visibleIf` and exit logic would never
 * hide anything (h938).
 */
function applyConditionsToExistingPanels(loopPanel: DynamicLoopModel): void {
  for (const panel of loopPanel.panels ?? []) {
    loopPanel.templateElements.forEach((templateElement) => {
      const name = (templateElement as IElement & { name?: string }).name;
      if (!name) return;

      const liveElement = panel.getQuestionByName(name) as IElement | undefined;
      if (!liveElement || !hasProperty(liveElement, "visibleIf")) return;

      const templateCondition = String(
        (templateElement as { visibleIf?: unknown }).visibleIf ?? "",
      );
      if (!templateCondition.includes(LOOP_EXIT_FUNCTION_NAME)) return;

      const liveCondition = String(
        (liveElement as { visibleIf?: unknown }).visibleIf ?? "",
      );
      if (liveCondition.includes(LOOP_EXIT_FUNCTION_NAME)) return;

      liveElement.visibleIf = templateCondition;
    });
  }
}

function injectIntoLoop(loopPanel: DynamicLoopModel): void {
  // `isLoopReady` marks a declaration (or instance) whose own templateElements
  // already carry the conditions, so injection cannot run twice.
  if (loopPanel.isLoopReady) return;

  injectTemplateLevelCondition(loopPanel);
  loopPanel.templateElements.forEach((element, elementIndex) => {
    injectElementLevelCondition(element, loopPanel.name, elementIndex);
  });

  loopPanel.isLoopReady = true;
}

/**
 * Idempotently injects visibility conditions for loop exit logic, for every
 * loop in the survey — including those declared inside another panel's template.
 */
export function injectVisibilityConditions(survey: SurveyModel) {
  const isDesignMode = survey.isDesignMode;
  if (isDesignMode) return;

  // Declarations first, so panels created later inherit the conditions.
  // A nested loop's declaration lives inside another loop's template, which
  // `survey.getAllQuestions()` never returned.
  collectLoopTemplates(survey).forEach(injectIntoLoop);

  // Live instances are separate objects from the declaration, each with their
  // own templateElements and panels. A loop bound to data that already existed
  // has panels built before any injection ran, so they are patched directly.
  collectLoopInstances(survey).forEach((loopInstance) => {
    injectIntoLoop(loopInstance);
    applyConditionsToExistingPanels(loopInstance);
  });
}
