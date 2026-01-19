import { addViewTokensToModelUseCase } from "@/features/asset-storage/server";
import { getSubmissionLocale } from "@/features/submissions/submission-localization";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestionModel } from "@/lib/questions/audio-recorder/audio-question-pdf";
import { Model } from "survey-core";

interface PreparePdfModelOptions {
  submission: Submission;
  customQuestionsJsonData: string[];
  useDefaultLocale?: boolean;
}

/**
 * Orchestrates the creation and authorization of a SurveyJS Model for PDF export.
 * This centralizes logic to avoid duplication across different export routes.
 * 
 * @returns A fully prepared and authorized SurveyJS Model
 */
export async function preparePdfModel({
  submission,
  customQuestionsJsonData,
  useDefaultLocale = false,
}: PreparePdfModelOptions): Promise<Model> {
  
  // Add custom questions to the model
  registerAudioQuestionModel();
  initializeCustomQuestions(customQuestionsJsonData);

  const surveyJson = JSON.parse(submission.formDefinition?.jsonData ?? "{}");
  const surveyModel = new Model(surveyJson);
  surveyModel.data = JSON.parse(submission.jsonData ?? "{}");

  // Set Locale
  const pdfLocale = useDefaultLocale
    ? undefined
    : getSubmissionLocale(submission);

  if (pdfLocale) {
    surveyModel.locale = pdfLocale;
  }

  // Authorize Assets
  await addViewTokensToModelUseCase(surveyModel);

  return surveyModel;
}
