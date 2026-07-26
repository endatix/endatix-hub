/** Columns soft-hidden under the `md` breakpoint when View prefs are untouched. */
export const NARROW_VIEWPORT_HIDDEN_COLUMN_IDS = [
  "startedAt",
  "completedAt",
  "completionTime",
] as const;

export type NarrowViewportHiddenColumnId =
  (typeof NARROW_VIEWPORT_HIDDEN_COLUMN_IDS)[number];

/**
 * Soft-hides lower-priority columns on narrow viewports.
 * Does nothing when `respectUserPrefs` is true (stored or user-customized View).
 */
export function withNarrowViewportDefaults(
  visibility: Record<string, boolean>,
  options: {
    isNarrow: boolean;
    respectUserPrefs: boolean;
  },
): Record<string, boolean> {
  if (!options.isNarrow || options.respectUserPrefs) {
    return { ...visibility };
  }

  const next: Record<string, boolean> = { ...visibility };
  for (const columnId of NARROW_VIEWPORT_HIDDEN_COLUMN_IDS) {
    if (columnId in next) {
      next[columnId] = false;
    }
  }

  return next;
}
