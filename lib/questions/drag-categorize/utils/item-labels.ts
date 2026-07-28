interface LabelledItem {
  value: unknown;
  text?: string;
}

/**
 * True when the scripter typed a real label for the item.
 *
 * SurveyJS `ItemValue.text` falls back to the item's value when no text was
 * entered, so an image-only item reports a label of "item1". Captions and alt
 * text must not surface that — it is an internal identifier, not something a
 * respondent should read or hear.
 */
export function hasExplicitLabel(item: LabelledItem): boolean {
  const text = item.text?.trim();
  if (!text) {
    return false;
  }
  return text !== String(item.value).trim();
}

/** The label to display, or an empty string when none was authored. */
export function getDisplayLabel(item: LabelledItem): string {
  return hasExplicitLabel(item) ? (item.text as string) : "";
}
