import { Submission } from "@/lib/endatix-api";
import { tryParseJson } from "@/lib/utils/type-parsers";
import { Metadata, MetadataSchema } from "../public-form/types";
import { Result } from "@/lib/result";
import { SurveyModel } from "survey-core";

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
  if (!locale || !surveyModel) {
    return false;
  }

  if (typeof locale !== "string" || locale.length === 0) {
    return false;
  }

  const usedLocales = surveyModel.getUsedLocales() || [];
  return usedLocales.includes(locale);
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

export { getSubmissionLocale, isLocaleValid, getLanguageDisplayName };
