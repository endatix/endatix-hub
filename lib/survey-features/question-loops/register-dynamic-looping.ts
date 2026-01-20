import { ItemValue, SurveyModel, ValueChangedEvent } from "survey-core";
import { registerDynamicLoopingProperties } from "./register-dynamic-looping-properties";

interface PanelItem {
  item: string; // This will allow users to refer pipe the looped question's value by using {panel.item}
  itemId: string;
}      

export function registerDynamicLooping(surveyModel: SurveyModel): () => void {

  registerDynamicLoopingProperties();

  const shuffleArray = (array: PanelItem[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  let isUpdatingLoop = false;

  const handler = (sender: SurveyModel, options: ValueChangedEvent) => {
    if (isUpdatingLoop) return;

    const dynamicPanels = sender
      .getAllQuestions()
      .filter(
        (q) =>
          q.getType() === "paneldynamic" &&
          Array.isArray(q.loopSource) &&
          q.loopSource.length > 0
      );

    const loopControlProps = [
      "randomizeLoop",
      "choicePattern",
      "maxLoopCount",
      "priorityItems",
    ];
    const isSourceChanged = dynamicPanels.some((p) =>
      p.loopSource.includes(options.name)
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
          filtered = allChoices.filter((c: ItemValue) => selectedValues.includes(c.value));
        } else if (panelQuestion.choicePattern === "Unselected Only") {
          filtered = allChoices.filter(
            (c: ItemValue) => !selectedValues.includes(c.value)
          );
        } else {
          filtered = allChoices;
        }
        combinedChoices.push(...filtered);
      });

      const seenValues = new Set();
      const priorityBucket: PanelItem[] = [];
      let othersBucket: PanelItem[] = [];

      combinedChoices.forEach((choice) => {
        if (!seenValues.has(choice.value)) {
          seenValues.add(choice.value);
          
          const itemObj = {
            item: choice.text || choice.value,
            itemId: choice.value,
          };

          if (priorityIds.includes(choice.value)) {
            priorityBucket.push(itemObj);
          } else {
            othersBucket.push(itemObj);
          }
        }
      });

      if (panelQuestion.randomizeLoop) {
        othersBucket = shuffleArray(othersBucket);
      }

      let finalValue = [...priorityBucket, ...othersBucket];

      const max = parseInt(panelQuestion.maxLoopCount);
      if (max > 0 && finalValue.length > max) {
        finalValue = finalValue.slice(0, max);
      }

      if (JSON.stringify(panelQuestion.value) !== JSON.stringify(finalValue)) {
        panelQuestion.value = finalValue;
      }
    });

    isUpdatingLoop = false;
  }

  surveyModel.onValueChanged.add(handler);

  return () => {
    surveyModel.onValueChanged.remove(handler);
  };
}