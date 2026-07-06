import type { ItemValue, QuestionSelectBase } from "survey-core";

/**
 * Copies a choice item onto a target question (SurveyJS copyChoiceItem pattern).
 */
export function copyChoiceItem(
  target: QuestionSelectBase,
  item: ItemValue,
): ItemValue {
  const res = target.createItemValue(item.value);
  res.setData(item);
  return res;
}

/**
 * Copies a choice including image picker fields when present.
 */
export function copyChoiceItemWithMedia(
  target: QuestionSelectBase,
  choice: ItemValue,
): ItemValue {
  const item = copyChoiceItem(target, choice);
  const sourceImageLink =
    choice.imageLink ||
    (choice.getPropertyValue?.("imageLink") as string | undefined);

  if (sourceImageLink) {
    item.imageLink = sourceImageLink;
  }

  if (choice.imageHeight != null) {
    item.imageHeight = choice.imageHeight;
  }

  if (choice.imageWidth != null) {
    item.imageWidth = choice.imageWidth;
  }

  return item;
}
