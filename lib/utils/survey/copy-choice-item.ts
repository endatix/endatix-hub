import { ItemValue, QuestionSelectBase, Serializer } from "survey-core";

/**
 * The property an item class uses for its image, asked of the Serializer.
 *
 * Choice item classes disagree on the name — SurveyJS's imagepicker declares
 * `imageLink` on `imageitemvalue`, the drag-categorize item declares
 * `imageUrl` — so carrying a choice between those types has to translate it;
 * writing `imageLink` onto a drag-categorize item stores something nothing
 * reads and the chip renders as text only.
 *
 * Both are declared `type: "file"`, which is what SurveyJS itself keys image
 * editors off, so the name is derived rather than listed here. That keeps this
 * shared utility free of any single question's vocabulary.
 *
 * Checks the class's own declared properties (Serializer.findClass(...).
 * properties) before falling back to the full inherited list
 * (Serializer.getProperties, which includes ancestors). Required once
 * matrix-carousel registered its own `imageUrl:file` on the shared
 * `itemvalue` base: without preferring the more specific declaration,
 * looking this up for an imagepicker item would find inherited `imageUrl`
 * before imagepicker's own `imageLink`, since both are `type:"file"` and
 * `getProperties` doesn't distinguish "declared here" from "inherited."
 */
export function findImageProperty(item: ItemValue): string | undefined {
  const ownProperty = Serializer.findClass(item.getType())?.properties.find(
    (property) => property.type === "file",
  );
  if (ownProperty) {
    return ownProperty.name;
  }

  return Serializer.getProperties(item.getType()).find(
    (property) => property.type === "file",
  )?.name;
}

/** The image on a choice item, whichever property its class declares. */
export function readItemImage(choice: ItemValue): string | undefined {
  const name = findImageProperty(choice);
  if (!name) return undefined;
  const source = choice as unknown as Record<string, unknown>;
  const value = source[name] ?? choice.getPropertyValue?.(name);
  return typeof value === "string" && value ? value : undefined;
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
