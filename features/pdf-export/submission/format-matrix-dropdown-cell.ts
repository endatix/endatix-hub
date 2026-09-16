import { formatChoiceDisplay } from "./format-choice-display";
import { formatPdfCellValue } from "./format-pdf-cell-value";

type MatrixDropdownCellQuestion = {
  displayValue?: unknown;
};

type MatrixDropdownRow = {
  getQuestionByColumnName?: (
    name: string,
  ) => MatrixDropdownCellQuestion | null | undefined;
};

function isChoiceStoredValue(
  value: unknown,
): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** Resolves a matrix-dropdown cell to PDF text, preferring SurveyJS display labels. */
export function formatMatrixDropdownCell(
  row: MatrixDropdownRow,
  columnName: string,
  stored: unknown,
): string {
  const displayText = formatPdfCellValue(
    row.getQuestionByColumnName?.(columnName)?.displayValue,
  );

  if (isChoiceStoredValue(stored)) {
    return formatChoiceDisplay(stored, displayText || undefined);
  }

  return displayText || formatPdfCellValue(stored);
}
