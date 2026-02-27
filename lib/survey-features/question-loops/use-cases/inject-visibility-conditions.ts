import { IElement, SurveyModel } from "survey-core";
import { PANEL_VISIBILITY_SENTINEL } from "../dynamic-loop-question";
import { getAllLoopQuestions } from "../loop-utils";
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
  if (!hasProperty(element, "visibleIf")) return;

  const elementVisibleIf = String(element.visibleIf ?? "");

  if (elementVisibleIf.includes(LOOP_EXIT_FUNCTION_NAME)) return;

  const isConditionEmpty =
    elementVisibleIf.length === 0 || elementVisibleIf.trim().length === 0;
  const elementVisibleCondition = `${LOOP_EXIT_FUNCTION_NAME}('${panelName}', {panelIndex}, ${elementIndex}) = false`;

  element.visibleIf = isConditionEmpty
    ? elementVisibleCondition
    : `(${elementVisibleIf}) and ${elementVisibleCondition}`;
}

/**
 * Idempotently injects visibility conditions for loop exit logic. Backs up the original JSON state to prevent pollution.
 */
export function injectVisibilityConditions(survey: SurveyModel) {
  const isDesignMode = survey.isDesignMode;
  if (isDesignMode) return;

  const dynamicPanels = getAllLoopQuestions(survey);
  dynamicPanels.forEach((loopPanel) => {
    if (loopPanel.isLoopReady) return;


    injectTemplateLevelCondition(loopPanel);
    loopPanel.templateElements.forEach((element, elementIndex) => {
      injectElementLevelCondition(element, loopPanel.name, elementIndex);
    });

    loopPanel.isLoopReady = true;
  });
}
