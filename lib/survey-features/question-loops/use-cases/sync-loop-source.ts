import { ItemValue, SurveyModel } from "survey-core";
import { DynamicLoopModel, PanelItem } from "../types";
import { getLoopChoicesFromQuestion, shuffleArray } from "../loop-utils";

/**
 * Core logic to evaluate and update a single loop panel's source.
 * Uses a Stable Merge Algorithm to prevent wiping user data upon re-evaluation.
 */
export function syncSingleLoopSource(
  sender: SurveyModel,
  panelQuestion: DynamicLoopModel,
) {
  const aggregatedLoopChoices: ItemValue[] = [];
  const priorityIds = panelQuestion.priorityItems || [];
  const seenValues = new Set();
  const priorityBucket: PanelItem[] = [];
  const othersBucket: PanelItem[] = [];

  panelQuestion.loopSource.forEach((sourceName: string) => {
    const sourceQuestion = sender.getQuestionByName(sourceName);
    if (!sourceQuestion) return;

    const loopChoices = getLoopChoicesFromQuestion(
      sourceQuestion,
      panelQuestion.choicePattern,
    );
    aggregatedLoopChoices.push(...loopChoices);
  });

  aggregatedLoopChoices.forEach((choice) => {
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

  const existingValue: PanelItem[] = Array.isArray(panelQuestion.value)
    ? panelQuestion.value
    : [];
  const existingValuesSet = new Set(existingValue.map((v) => v.itemValue));

  const max = parseInt(panelQuestion.maxLoopCount);
  let selectedOthers: PanelItem[] = [];

  // 4. Handle Max Limits (Prioritize keeping existing data!)
  if (max > 0) {
    const otherSlotsAvailable = Math.max(0, max - priorityBucket.length);

    // Split 'others' into items we already have vs brand new ones
    const existingOthers = othersBucket.filter((o) =>
      existingValuesSet.has(o.itemValue),
    );
    const newOthers = othersBucket.filter(
      (o) => !existingValuesSet.has(o.itemValue),
    );

    // Keep existing others first so we don't drop user data unnecessarily
    const othersToKeep = existingOthers.slice(0, otherSlotsAvailable);

    // Fill remaining slots with new items
    const remainingSlots = otherSlotsAvailable - othersToKeep.length;
    let othersToAdd = remainingSlots > 0 ? newOthers : [];

    if (remainingSlots > 0 && othersToAdd.length > remainingSlots) {
      // Pick randomly from the new items if we have more than we need
      const poolToPickFrom = panelQuestion.randomizeLoop
        ? shuffleArray([...othersToAdd])
        : othersToAdd;
      othersToAdd = poolToPickFrom.slice(0, remainingSlots);
    }

    selectedOthers = [...othersToKeep, ...othersToAdd];
  } else {
    selectedOthers = othersBucket;
  }

  const finalValueBucket = [...priorityBucket, ...selectedOthers];
  const finalValueSet = new Set(finalValueBucket.map((v) => v.itemValue));

  let finalValue: PanelItem[] = [];

  // 5. Construct Final Array: Preserve Existing Order First
  existingValue.forEach((existingItem) => {
    if (finalValueSet.has(existingItem.itemValue)) {
      finalValue.push(existingItem);
      finalValueSet.delete(existingItem.itemValue); // Mark as processed
    }
  });

  // 6. Append New Items (Randomize ONLY the new items)
  let newItemsToAdd = finalValueBucket.filter((item) =>
    finalValueSet.has(item.itemValue),
  );

  if (panelQuestion.randomizeLoop) {
    newItemsToAdd = shuffleArray(newItemsToAdd);
  }

  finalValue.push(...newItemsToAdd);

  // 7. Re-index and apply
  finalValue = finalValue.map((obj, index) => ({
    ...obj,
    loopIndex: index,
  }));

  // Only trigger a SurveyJS update if the array actually changed
  if (JSON.stringify(existingValue) !== JSON.stringify(finalValue)) {
    panelQuestion.value = finalValue;
  }
}
