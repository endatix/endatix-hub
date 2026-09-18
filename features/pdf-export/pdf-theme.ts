/**
 * Print tokens derived from SurveyJS `ITheme.cssVariables`.
 * Look-and-feel for paper — not a pixel match of the live survey.
 * Missing vars fall back to the Endatix Hub light survey palette.
 */
export interface PdfTheme {
  pageBackground: string;
  surface: string;
  inputBackground: string;
  primary: string;
  onPrimary: string;
  text: string;
  mutedText: string;
  border: string;
  positive: string;
  negative: string;
  radius: number;
  /** Body size in pt, already clamped for print. */
  fontSize: number;
}

export const DEFAULT_PDF_THEME: PdfTheme = {
  pageBackground: "#ffffff",
  surface: "#ffffff",
  inputBackground: "#ffffff",
  primary: "#0054d1",
  onPrimary: "#f8fafc",
  text: "#020817",
  mutedText: "#64748b",
  border: "#e2e8f0",
  positive: "#298e5f",
  negative: "#ef4444",
  radius: 6,
  fontSize: 11,
};
