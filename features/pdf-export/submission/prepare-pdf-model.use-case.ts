import { addViewTokensToModelUseCase } from "@/features/asset-storage/server";
import { primeDataListDisplayValues } from "@/lib/survey-features/data-lists/infrastructure/prime-data-list-display-values";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import {
  getSubmissionLocale,
  resolvePdfCatalogLocale,
  toSurveyModelLocale,
  type PdfCatalogLocaleDecision,
} from "@/lib/localization";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestionModel } from "@/lib/questions/audio-recorder/audio-question-pdf";
// Model-only: barrel would pull survey-react-ui + stylesheet into this server path.
import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { Model } from "survey-core";

interface PreparePdfModelOptions {
  submission: Submission;
  customQuestionsJsonData: string[];
  /** Catalog code from `?locale=`. Omitted when the caller did not choose one. */
  requestedLocale?: string;
  /** Legacy `?defaultLocale=true` links. Wins over requestedLocale. */
  forceDefaultLocale?: boolean;
}

export type PreparedPdfModel = {
  surveyModel: Model;
  locale: PdfCatalogLocaleDecision;
};

/**
 * Orchestrates the creation and authorization of a SurveyJS Model for PDF export.
 * This centralizes logic to avoid duplication across different export routes.
 *
 * @returns A fully prepared and authorized SurveyJS Model
 */
export async function preparePdfModel({
  submission,
  customQuestionsJsonData,
  requestedLocale,
  forceDefaultLocale = false,
}: PreparePdfModelOptions): Promise<PreparedPdfModel> {
  // Add custom questions to the model
  registerAudioQuestionModel();
  registerDragCategorizeModel();
  initializeCustomQuestions(customQuestionsJsonData);
  registerDataListGlobals();

  const surveyJson = JSON.parse(submission.formDefinition?.jsonData ?? "{}");
  const surveyModel = new Model(surveyJson);

  const locale = resolvePdfCatalogLocale({
    usedLocales: surveyModel.getUsedLocales() ?? [],
    submissionLocale: getSubmissionLocale(submission),
    requestedLocale,
    forceDefault: forceDefaultLocale,
  });
  surveyModel.locale = toSurveyModelLocale(locale.catalogLocale);
  surveyModel.data = JSON.parse(submission.jsonData ?? "{}");

  await primeDataListDisplayValues(surveyModel, submission.formId);

  // Authorize Assets
  await addViewTokensToModelUseCase(surveyModel);

  return { surveyModel, locale };
}
