import type { PdfThemeStyles } from "@/features/pdf-export/create-pdf-theme-styles";

export interface PdfFormChrome {
  themeStyles: PdfThemeStyles;
  fillable: boolean;
}

export function pdfFormFieldProps(chrome: PdfFormChrome) {
  return {
    readOnly: !chrome.fillable,
    noExport: true,
  } as const;
}

export function sanitizePdfFieldName(raw: string): string {
  const trimmed = raw.trim() || "field";
  return trimmed.replaceAll(/[^\w.-]+/g, "_").slice(0, 80);
}
