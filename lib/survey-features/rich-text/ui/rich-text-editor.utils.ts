/**
 * Pure helpers for rich text editor logic. Kept separate so they can be
 * unit-tested without Quill or SurveyJS.
 */

/** Editor-like shape used by Quill bubble theme (tooltip). */
interface BubbleThemeTooltip {
  tooltip?: { hide?: () => void };
}

/**
 * Returns whether the editor has an active (non-empty) selection.
 * Safe to call with null/undefined.
 */
export function hasActiveSelectionFromEditor(editor: unknown): boolean {
  const q = editor as
    | { selection?: { savedRange?: { length?: number } } }
    | null
    | undefined;
  return Boolean(
    q?.selection?.savedRange && (q.selection.savedRange.length ?? 0) > 0,
  );
}

/**
 * Hides the bubble tooltip if the editor theme exposes one.
 * Safe to call with null/undefined.
 */
export function hideTooltipFromEditor(editor: unknown): void {
  const theme = (editor as { theme?: BubbleThemeTooltip })?.theme;
  theme?.tooltip?.hide?.();
}
