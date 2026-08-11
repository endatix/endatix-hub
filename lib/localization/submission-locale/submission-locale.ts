import { Submission } from "@/lib/endatix-api";
import { tryParseJson } from "@/lib/utils/type-parsers";
import { Metadata, MetadataSchema } from "@/features/public-form/types";
import { Result } from "@/lib/result";
import { SurveyModel } from "survey-core";
import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  toCatalogLocales,
  toSurveyModelLocale,
} from "@/lib/localization/catalog";

/**
 * Get the Submission locale according to the view preference
 * @param submission - The submission
 * @returns The Submission locale as stored in the submission metadata or undefined if not found
 */
function getSubmissionLocale(submission: Submission): string | undefined {
  if (!submission.metadata) {
    return undefined;
  }

  const parsedJsonResult = tryParseJson<Metadata>(submission.metadata);
  if (Result.isError(parsedJsonResult)) {
    return undefined;
  }

  const metadataResult = MetadataSchema.safeParse(parsedJsonResult.value);
  if (metadataResult.success) {
    return metadataResult.data?.language ?? undefined;
  }

  return undefined;
}

/**
 * Check if the locale is valid for the survey model
 * @param locale - The locale to check
 * @param surveyModel - The survey model
 * @returns True if the locale is valid, false otherwise
 */
function isLocaleValid(
  locale: string | undefined,
  surveyModel: SurveyModel,
): boolean {
  if (locale == null || !surveyModel) {
    return false;
  }

  if (typeof locale !== "string") {
    return false;
  }

  const catalogLocale = fromSurveyModelLocale(locale);
  const usedLocales = toCatalogLocales(surveyModel.getUsedLocales() || []);
  return usedLocales.includes(catalogLocale);
}

/**
 * Get the display name of the locale
 * @param locale - The locale to get the display name for
 * @returns The display name of the locale or the locale if not found
 */
function getLanguageDisplayName(locale: string | undefined) {
  if (!locale) {
    return locale;
  }

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
    return displayNames.of(locale) ?? locale;
  } catch {
    return locale;
  }
}

/**
 * SurveyJS `model.locale` for a submission view: preferred metadata language
 * when enabled and valid, otherwise the catalog default (`""`).
 */
function resolveSurveyModelLocaleForSubmission(
  submission: Submission,
  surveyModel: SurveyModel,
  useSubmissionLanguage: boolean,
): string {
  if (useSubmissionLanguage) {
    const submissionLocale = getSubmissionLocale(submission);
    if (isLocaleValid(submissionLocale, surveyModel)) {
      return toSurveyModelLocale(submissionLocale!);
    }
  }

  return toSurveyModelLocale(DEFAULT_CATALOG_LOCALE);
}

export {
  getSubmissionLocale,
  isLocaleValid,
  getLanguageDisplayName,
  resolveSurveyModelLocaleForSubmission,
};
