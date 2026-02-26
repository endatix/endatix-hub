import { DynamicPanelItemValueChangedEvent, SurveyModel } from "survey-core";
import { LoopExitState, DynamicLoopModel } from "./types";
import { PANEL_VISIBILITY_SENTINEL } from "./dynamic-loop-question";

const EXIT_MARKER = "isLoopExited";

/**
 * Idempotently injects loop exit logic. Backs up the original JSON state to prevent pollution.
 */
export function applyLoopExitWrappers(survey: SurveyModel) {
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

function resolveCondition(
  condition: string,
  panelName: string,
  currentIndex: number,
) {
  if (!condition) return "";

  // Regex looks for "{panel." (case insensitive)
  // and replaces it with "{PanelName[Index]."
  const absolutePath = `{${panelName}[${currentIndex}].`;
  return condition.replace(/\{panel\./gi, absolutePath);
}

export function handleLoopExits(survey: SurveyModel) {
  const handler = (
    sender: SurveyModel,
    options: DynamicPanelItemValueChangedEvent,
  ) => {
    const loopPanel = options.question as DynamicLoopModel;
    const { loopSource, exitLoopCondition, exitAllLoopsCondition } = loopPanel;

    if (!loopSource || loopSource.length === 0) return;
    if (!exitAllLoopsCondition && !exitLoopCondition) return;

    const meta: LoopExitState = loopPanel.exitMeta ?? {
      exitCurrentTriggeredIndexMap: {},
    };
    let stateChanged = false;

    if (
      typeof exitAllLoopsCondition === "string" &&
      exitAllLoopsCondition.trim() !== ""
    ) {
      const expr = resolveCondition(
        exitAllLoopsCondition,
        loopPanel.name,
        options.panelIndex,
      );
      const shouldExitAll = !!sender.runCondition(expr);

      if (shouldExitAll) {
        if (
          meta.exitAllTriggeredPanelIndex === undefined ||
          meta.exitAllTriggeredPanelIndex > options.panelIndex
        ) {
          meta.exitAllTriggeredPanelIndex = options.panelIndex;
          stateChanged = true;
        }
      } else if (meta.exitAllTriggeredPanelIndex === options.panelIndex) {
        meta.exitAllTriggeredPanelIndex = undefined;
        stateChanged = true;
      }
    }

    if (
      typeof exitLoopCondition === "string" &&
      exitLoopCondition.trim() !== ""
    ) {
      const expr = resolveCondition(
        exitLoopCondition,
        loopPanel.name,
        options.panelIndex,
      );
      const shouldExitCurrent = !!sender.runCondition(expr);

      if (!meta.exitCurrentTriggeredIndexMap)
        meta.exitCurrentTriggeredIndexMap = {};

      if (shouldExitCurrent) {
        const triggerIndex = options.panel.questions.findIndex(
          (q) => q.name === options.name,
        );
        if (
          triggerIndex !== -1 &&
          meta.exitCurrentTriggeredIndexMap[options.panelIndex] !== triggerIndex
        ) {
          meta.exitCurrentTriggeredIndexMap[options.panelIndex] = triggerIndex;
          stateChanged = true;
        }
      } else if (
        meta.exitCurrentTriggeredIndexMap[options.panelIndex] !== undefined
      ) {
        delete meta.exitCurrentTriggeredIndexMap[options.panelIndex];
        stateChanged = true;
      }
    }

    if (stateChanged) {
      loopPanel.exitMeta = {
        exitAllTriggeredPanelIndex: meta.exitAllTriggeredPanelIndex,
        exitCurrentTriggeredIndexMap: { ...meta.exitCurrentTriggeredIndexMap },
      };
      // Re-evaluate visibleIf expressions that use exitMeta (SurveyJS internal API)
      (sender as unknown as { runConditions(): void }).runConditions();
    }
  };

  survey.onDynamicPanelValueChanged.add(handler);

  return () => {
    survey.onDynamicPanelValueChanged.remove(handler);
  };
}
