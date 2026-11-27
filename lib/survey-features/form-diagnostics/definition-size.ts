import type { ImageReview } from "./embedded-images";

const utf8 = new TextEncoder();

/** Compact UTF-8 JSON, the same representation the editor submits on Save. */
export function definitionBytes(value: unknown) {
  return utf8.encode(JSON.stringify(value)).byteLength;
}

// Representative unsigned content URL. Hosts, owner IDs and generated file names vary.
export const ESTIMATED_LINK_BYTES = 96;

export function estimatedImageSavings(review: ImageReview) {
  return review.eligible.reduce((bytes, { span }) =>
    bytes + definitionBytes(span.source) - 2 - ESTIMATED_LINK_BYTES, 0);
}

export function sizeChange(before: number, after: number) {
  const delta = before - after;
  return { before, after, delta, percent: before ? Math.abs(delta) * 100 / before : 0 };
}
