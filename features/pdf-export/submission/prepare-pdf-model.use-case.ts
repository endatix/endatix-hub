import { addViewTokensToModelUseCase } from "@/features/asset-storage/server";
import { primeDataListDisplayValues } from "@/lib/survey-features/data-lists/infrastructure/prime-data-list-display-values";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { getSubmissionLocale, toSurveyModelLocale } from "@/lib/localization";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestionModel } from "@/lib/questions/audio-recorder/audio-question-pdf";
// Model-only: barrel would pull survey-react-ui + stylesheet into this server path.
import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { Model } from "survey-core";
import {
  resolvePdfLocale,
  type PdfLocaleDecision,
  type PdfLocaleQuery,
} from "./pdf-locale";

interface PreparePdfModelOptions {
  submission: Submission;
  customQuestionsJsonData: string[];
  localeQuery?: PdfLocaleQuery;
}

export type PreparedPdfModel = {
  surveyModel: Model;
  locale: PdfLocaleDecision;
};

/**
 * Orchestrates the creation and authorization of a SurveyJS Model for PDF export.
 * This centralizes logic to avoid duplication across different export routes.
 *
 * @returns The authorized model and the label locale it was rendered in
 */
export async function preparePdfModel({
  submission,
  customQuestionsJsonData,
  localeQuery,
}: PreparePdfModelOptions): Promise<PreparedPdfModel> {
  // Add custom questions to the model
  registerAudioQuestionModel();
  registerDragCategorizeModel();
  initializeCustomQuestions(customQuestionsJsonData);
  registerDataListGlobals();

  const surveyJson = JSON.parse(submission.formDefinition?.jsonData ?? "{}");
  const surveyModel = new Model(surveyJson);

  const locale = resolvePdfLocale(
    surveyModel.getUsedLocales() ?? [],
    getSubmissionLocale(submission),
    localeQuery,
  );
  surveyModel.locale = toSurveyModelLocale(locale.catalogLocale);
  surveyModel.data = JSON.parse(submission.jsonData ?? "{}");

  await primeDataListDisplayValues(surveyModel, submission.formId);

  // Authorize Assets
  await addViewTokensToModelUseCase(surveyModel);

  return { surveyModel, locale };
}
