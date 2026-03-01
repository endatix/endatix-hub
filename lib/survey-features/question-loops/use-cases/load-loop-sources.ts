import { SurveyModel, ValueChangedEvent } from "survey-core";
import { getAllLoopQuestions } from "../loop-utils";
import { syncSingleLoopSource } from "./sync-loop-source";

let isUpdatingLoop = false;

/**
 * Loads the loop sources and shuffles them based of provided properties. Turnes the sources into dynamic panels.
 * This is implementation of onValueChanged event handler https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#onValueChanged
 * @param sender - The survey model
 * @param options - The options for the dynamic panel item value changed event
 */
export function loadLoopSources(
  sender: SurveyModel,
  options: ValueChangedEvent,
) {
  if (isUpdatingLoop) return;

  const dynamicPanels = getAllLoopQuestions(sender);

  const loopControlProps = new Set([
    "randomizeLoop",
    "choicePattern",
    "maxLoopCount",
    "priorityItems",
  ]);

  const panelsToUpdate = dynamicPanels.filter(
    (panel) =>
      panel.loopSource.includes(options.name) ||
      loopControlProps.has(options.name),
  );

  if (panelsToUpdate.length === 0) return;

  isUpdatingLoop = true;

  panelsToUpdate.forEach((panelQuestion) => {
    syncSingleLoopSource(sender, panelQuestion);
  });

  isUpdatingLoop = false;
}
