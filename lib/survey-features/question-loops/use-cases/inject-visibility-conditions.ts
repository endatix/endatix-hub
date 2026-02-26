import { SurveyModel } from "survey-core";
import { PANEL_VISIBILITY_SENTINEL } from "../dynamic-loop-question";

const EXIT_MARKER = "isLoopExited";

/**
 * Idempotently injects visibility conditions for loop exit logic. Backs up the original JSON state to prevent pollution.
 */
export function injectVisibilityConditions(survey: SurveyModel) {
  const isDesignMode = survey.isDesignMode;
  if (isDesignMode) return;

  const dynamicPanels = survey
    .getAllQuestions()
    .filter(
      (q) =>
        q.getType() === "paneldynamic" &&
        Array.isArray((q as { loopSource?: unknown }).loopSource),
    );

  dynamicPanels.forEach((panel) => {
    const loopPanel = panel as unknown as {
      name: string;
      templateVisibleIf?: string;
      originalTemplateVisibleIf?: string;
      templateElements: {
        visibleIf?: string;
        visible?: boolean;
        originalVisibleIf?: string;
        originalVisible?: boolean;
      }[];
    };

    const origPanelIf = loopPanel.templateVisibleIf ?? "true";
    if (!origPanelIf.includes(EXIT_MARKER)) {
      loopPanel.originalTemplateVisibleIf = loopPanel.templateVisibleIf;
      loopPanel.templateVisibleIf = `(${origPanelIf}) and ${EXIT_MARKER}('${loopPanel.name}', {panelIndex}, ${PANEL_VISIBILITY_SENTINEL}) = false`;
    }

    loopPanel.templateElements.forEach((element, elementIndex) => {
      const origIf = element.visibleIf ?? "";
      if (!origIf.includes(EXIT_MARKER)) {
        element.originalVisibleIf = element.visibleIf;
        element.originalVisible = element.visible;

        const baseLogic = origIf
          ? origIf
          : element.visible === false
            ? "false"
            : "true";
        element.visibleIf = `(${baseLogic}) and ${EXIT_MARKER}('${loopPanel.name}', {panelIndex}, ${elementIndex}) = false`;
      }
    });
  });
}

/**
 * Restores the original design-time JSON state, completely removing the runtime expressions.
 */
export function removeLoopExitWrappers(survey: SurveyModel) {
  const dynamicPanels = survey
    .getAllQuestions()
    .filter((q) => q.getType() === "paneldynamic");

  dynamicPanels.forEach((panel) => {
    const loopPanel = panel as unknown as {
      templateVisibleIf?: string;
      originalTemplateVisibleIf?: string;
      templateElements: {
        visibleIf?: string;
        visible?: boolean;
        originalVisibleIf?: string;
        originalVisible?: boolean;
      }[];
    };

    if (loopPanel.originalTemplateVisibleIf !== undefined) {
      loopPanel.templateVisibleIf = loopPanel.originalTemplateVisibleIf;
      delete loopPanel.originalTemplateVisibleIf;
    }

    loopPanel.templateElements.forEach((element) => {
      if (element.originalVisibleIf !== undefined) {
        element.visibleIf = element.originalVisibleIf;
        delete element.originalVisibleIf;
      }
      if (element.originalVisible !== undefined) {
        element.visible = element.originalVisible;
        delete element.originalVisible;
      }
    });
  });
}
