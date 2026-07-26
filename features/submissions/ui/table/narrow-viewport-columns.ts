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
 * Call only when applying soft defaults (no stored View prefs).
 */
export function withNarrowViewportDefaults(
  visibility: Record<string, boolean>,
  options: {
    isNarrow: boolean;
  },
): Record<string, boolean> {
  if (!options.isNarrow) {
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
