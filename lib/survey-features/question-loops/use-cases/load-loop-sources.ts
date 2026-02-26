import { ItemValue, SurveyModel, ValueChangedEvent } from "survey-core";
import { PanelItem } from "../types";
import { getAllLoopQuestions, shuffleArray } from "../loop-utils";

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

  const loopControlProps = [
    "randomizeLoop",
    "choicePattern",
    "maxLoopCount",
    "priorityItems",
  ];

  const isSourceChanged = dynamicPanels.some((panel) =>
    panel.loopSource.includes(options.name),
  );

  if (!isSourceChanged && !loopControlProps.includes(options.name)) return;

  isUpdatingLoop = true;

  dynamicPanels.forEach((panelQuestion) => {
    const combinedChoices: ItemValue[] = [];
    const priorityIds = panelQuestion.priorityItems || [];

    panelQuestion.loopSource.forEach((sourceName: string) => {
      const sourceQuestion = sender.getQuestionByName(sourceName);
      if (!sourceQuestion) return;

      const allChoices = sourceQuestion.choices || [];
      const rawValue = sourceQuestion.value;
      const selectedValues = Array.isArray(rawValue)
        ? rawValue
        : rawValue != null
          ? [rawValue]
          : [];

      let filtered = [];
      if (panelQuestion.choicePattern === "Selected Only") {
        filtered = allChoices.filter((c: ItemValue) =>
          selectedValues.includes(c.value),
        );
      } else if (panelQuestion.choicePattern === "Unselected Only") {
        filtered = allChoices.filter(
          (c: ItemValue) => !selectedValues.includes(c.value),
        );
      } else {
        filtered = allChoices;
      }
      combinedChoices.push(...filtered);
    });

    const seenValues = new Set();
    const priorityBucket: PanelItem[] = [];
    const othersBucket: PanelItem[] = [];

    combinedChoices.forEach((choice) => {
      if (!seenValues.has(choice.value)) {
        seenValues.add(choice.value);

        const itemObj = {
          itemText: choice.text || choice.value,
          itemValue: choice.value,
        };

        if (priorityIds.includes(choice.value)) {
          priorityBucket.push(itemObj);
        } else {
          othersBucket.push(itemObj);
        }
      }
    });

    const max = parseInt(panelQuestion.maxLoopCount);
    let finalValue: PanelItem[] = [];

    if (max > 0) {
      const otherSlotsAvailable = Math.max(0, max - priorityBucket.length);
      const shuffledOthers = shuffleArray([...othersBucket]);
      const selectedOthers = shuffledOthers.slice(0, otherSlotsAvailable);

      finalValue = [...priorityBucket, ...selectedOthers];

      if (panelQuestion.randomizeLoop) {
        finalValue = shuffleArray(finalValue);
      }
    } else {
      finalValue = [...priorityBucket, ...othersBucket];
      if (panelQuestion.randomizeLoop) {
        finalValue = shuffleArray(finalValue);
      }
    }

    finalValue = finalValue.map((obj, index) => ({
      ...obj,
      loopIndex: index,
    }));

    if (JSON.stringify(panelQuestion.value) !== JSON.stringify(finalValue)) {
      panelQuestion.value = finalValue;
    }
  });

  isUpdatingLoop = false;
}
