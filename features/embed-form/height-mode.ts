/** Neutral fallback used before the survey's own theme is known (or if it never defines a dim background), so fill mode never leaves a transparent gap. */
export const DEFAULT_FILL_BACKGROUND_COLOR = "#f3f3f3";

export function isFillHeightMode(value: string | null | undefined): boolean {
  return value === "fill";
}
