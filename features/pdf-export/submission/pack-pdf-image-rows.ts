/**
 * A4 (595pt) minus the page padding (20) and the answers section padding (8).
 * Image rows use this so they line up with the question text.
 */
export const PDF_IMAGE_ROW_WIDTH = 539;
const GAP = 8;
/** Keeps a portrait from filling the page, so the name under it stays in view. */
const MAX_ROW_HEIGHT = 200;

export interface PdfImageSlot {
  index: number;
  width: number;
  height: number;
}

/**
 * Packs images into rows that share a height and keep each image's ratio.
 * A wide photo takes a row by itself. Portraits sit side by side.
 */
export function packPdfImageRows(
  ratios: number[],
  contentWidth = PDF_IMAGE_ROW_WIDTH,
): PdfImageSlot[][] {
  const rows: number[][] = [];
  let current: number[] = [];

  for (let index = 0; index < ratios.length; index++) {
    const next = [...current, index];
    if (current.length > 0 && rowWidth(next, ratios, MAX_ROW_HEIGHT) > contentWidth) {
      rows.push(current);
      current = [index];
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    rows.push(current);
  }

  return rows.map((indexes) => fitRow(indexes, ratios, contentWidth));
}

function rowWidth(indexes: number[], ratios: number[], height: number): number {
  const images = indexes.reduce((sum, index) => sum + height * ratios[index], 0);
  return images + GAP * (indexes.length - 1);
}

function fitRow(
  indexes: number[],
  ratios: number[],
  contentWidth: number,
): PdfImageSlot[] {
  const gaps = GAP * (indexes.length - 1);
  const ratioSum = indexes.reduce((sum, index) => sum + ratios[index], 0);
  let height = (contentWidth - gaps) / ratioSum;
  if (height > MAX_ROW_HEIGHT) {
    height = MAX_ROW_HEIGHT;
  }

  const slots = indexes.map((index) => ({
    index,
    width: Math.round(height * ratios[index]),
    height: Math.round(height),
  }));
  const used =
    slots.reduce((sum, slot) => sum + slot.width, 0) +
    GAP * Math.max(slots.length - 1, 0);
  const overflow = used - contentWidth;
  if (overflow > 0 && slots.length > 0) {
    slots[slots.length - 1].width -= overflow;
  }
  return slots;
}
