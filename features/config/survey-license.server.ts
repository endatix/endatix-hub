import "server-only";

/**
 * SurveyJS Creator licence key. NOT part of {@link ClientEndatixConfig}: that projection
 * is serialised into the HTML of every page mounting AppProvider, including anonymous public
 * form routes. Only the authenticated designer surface receives it via SurveyLicenseProvider.
 */
export function getSurveyLicenseKey(): string {
  return process.env.ENDATIX_SURVEY_LICENSE_KEY?.trim() ?? "";
}
