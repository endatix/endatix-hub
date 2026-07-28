import { ItemValue, QuestionSelectBase, Serializer } from "survey-core";

/**
 * Property names choice items use for their image, in read preference order.
 *
 * SurveyJS's imagepicker calls it `imageLink` on `imageitemvalue`; the
 * drag-categorize item calls it `imageUrl`. Neither class declares the other,
 * so carrying a choice across those types has to translate the name — copying
 * `imageLink` onto a drag-categorize item stores a property nothing reads, and
 * the chip renders as text only.
 */
const IMAGE_PROPERTIES = ["imageLink", "imageUrl"] as const;

/** The image on a choice item, whichever property its class uses. */
function readItemImage(choice: ItemValue): string | undefined {
  const source = choice as unknown as Record<string, unknown>;
  for (const name of IMAGE_PROPERTIES) {
    const value = source[name] ?? choice.getPropertyValue?.(name);
    if (typeof value === "string" && value) {
      return value;
    }
  }
  return undefined;
}

/**
 * The image property the item's own class declares, asked of the Serializer
 * rather than inferred from the question type — a custom choice item gets the
 * same treatment for free.
 */
function findImageProperty(item: ItemValue): string | undefined {
  return IMAGE_PROPERTIES.find((name) =>
    Boolean(Serializer.findProperty(item.getType(), name)),
  );
}

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
 * Copies a choice including its image, translating the image property name
 * when source and target disagree on it.
 */
export function copyChoiceItemWithMedia(
  target: QuestionSelectBase,
  choice: ItemValue,
): ItemValue {
  const item = copyChoiceItem(target, choice);

  const image = readItemImage(choice);
  const imageProperty = image ? findImageProperty(item) : undefined;
  if (image && imageProperty) {
    (item as unknown as Record<string, unknown>)[imageProperty] = image;
  }

  if (choice.imageHeight != null) {
    item.imageHeight = choice.imageHeight;
  }

  if (choice.imageWidth != null) {
    item.imageWidth = choice.imageWidth;
  }

  return item;
}
