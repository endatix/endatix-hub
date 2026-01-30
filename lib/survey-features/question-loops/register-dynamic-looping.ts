import { ItemValue, SurveyModel, ValueChangedEvent } from "survey-core";
import { handleLoopExits } from "./handle-loop-navigation";
import { registerDynamicLoopingProperties } from "./register-dynamic-looping-properties";

// This following properties will be injected into the value of each panel
// Allowing users to use them for text piping, expressions, and see them in the survey results
interface PanelItem {
  itemText: string; 
  itemValue: string;
  loopIndex?: number;
}

export function registerDynamicLooping(surveyModel: SurveyModel): () => void {

  registerDynamicLoopingProperties();
  const cleanupExitHandlers = handleLoopExits(surveyModel);
  
  const shuffleArray = (array: PanelItem[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const rand = new Uint32Array(1);
      crypto.getRandomValues(rand);
      const j = rand[0] % (i + 1);
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
        ...obj,             // <--- This copies 'item' and 'itemValue'
        loopIndex: index    // <--- This adds the new property
      }));

      if (JSON.stringify(panelQuestion.value) !== JSON.stringify(finalValue)) {
        panelQuestion.value = finalValue;
      }
    });

    isUpdatingLoop = false;
  }

  surveyModel.onValueChanged.add(handler);

  return () => {
    surveyModel.onValueChanged.remove(handler);
    cleanupExitHandlers();
  };
}