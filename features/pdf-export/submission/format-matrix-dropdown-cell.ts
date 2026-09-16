import { formatChoiceDisplay } from "./format-choice-display";
import { formatPdfCellValue } from "./format-pdf-cell-value";

function isChoiceStoredValue(
  value: unknown,
): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** PDF text for one matrix-dropdown cell: stored value + SurveyJS display label. */
export function formatMatrixDropdownCell(
  stored: unknown,
  display: unknown,
): string {
  const displayText = formatPdfCellValue(display);

  if (isChoiceStoredValue(stored)) {
    return formatChoiceDisplay(stored, displayText || undefined);
  }

  return displayText || formatPdfCellValue(stored);
}
