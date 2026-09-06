/**
 * Shared constants for the question-loops slice.
 *
 * These live here rather than in `dynamic-loop-question.ts` so that `utils/`
 * helpers can import them without pulling in the Serializer definitions (and
 * the import cycle that comes with them).
 */

/** SurveyJS question type that backs a loop. */
export const PANEL_QUESTION_TYPE = "paneldynamic";

/**
 * Question index used by the injected template-level visibility condition to
 * mean "the whole panel", as opposed to a specific question within it.
 */
export const PANEL_VISIBILITY_SENTINEL = 9999;

/**
 * SurveyJS's variable name for the panel a question belongs to. A `loopSource`
 * entry prefixed with this resolves against the containing panel instance
 * rather than the survey root — the same convention SurveyJS carry-forward
 * uses for `choicesFromQuestion`.
 */
export const PANEL_SCOPE_PREFIX = "panel.";

/**
 * How deeply loops may nest. Depth 1 is a page-level loop; depth 2 is a loop
 * inside one dynamic panel. Panel counts multiply at every level, so this is
 * enforced at runtime (loops below it are not synced) and in the designer
 * (they cannot be configured) rather than merely warned about.
 */
export const MAX_LOOP_DEPTH = 2;
