/**
 * Shared layout for the submission answers grid: label (2 cols) + value (3 cols).
 * Caps value width so metadata rows align with text inputs and other answer viewers.
 */
export const submissionAnswerValueColumnClass =
  "col-span-3 w-full min-w-0 max-w-2xl";

/** Minimum row height aligned with shadcn Input (h-9). */
export const submissionMetaRowClass =
  "flex min-h-9 w-full items-center gap-2 rounded-md border border-border px-3 py-0";
