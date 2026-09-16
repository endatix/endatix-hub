import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

/**
 * Matrix-dropdown cells can hold primitives, choice arrays, or nested objects.
 * `String(object)` becomes "[object Object]"; this is the display form for PDF.
 */
export function formatPdfCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "string") {
    return pdfPlainText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(formatPdfCellValue)
      .filter((part) => part.length > 0)
      .join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
}
