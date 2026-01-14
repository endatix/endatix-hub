import { useState, useEffect, use } from "react";
import {
  AfterRenderQuestionEvent,
  ChoiceItem,
  Model,
  SurveyModel,
} from "survey-core";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { useDynamicVariables } from "../application/use-dynamic-variables.hook";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { customQuestions as customQuestionsList } from "@/customizations/questions/question-registry";
import { ReadTokensResult } from "@/features/storage/use-cases/generate-read-tokens";
import { Result } from "@/lib/result";

export function useSurveyModel(
  definition: string,
  submission?: Submission,
  customQuestions?: string[],
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  },
) {
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const { setFromMetadata } = useDynamicVariables(surveyModel);
  const contentTokenResult = use(
    readTokenPromises?.content ??
      Promise.resolve(
        Result.success({
          token: "",
          hostName: "",
          expiresOn: new Date(),
          generatedAt: new Date(),
        }),
      ),
  );

  // Load custom questions before creating survey model
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // Load built-in custom questions
        if (customQuestions?.length) {
          initializeCustomQuestions(customQuestions);
        }
        // Load dynamic questions from form metadata
        for (const questionName of customQuestionsList) {
          try {
            await questionLoaderModule.loadQuestion(questionName);
            console.debug(`✅ Loaded custom question: ${questionName}`);
          } catch (error) {
            console.warn(
              `⚠️ Failed to load custom question: ${questionName}`,
              error,
            );
          }
        }
      } catch (error) {
        console.error("Error loading questions:", error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [customQuestions]);

  useEffect(() => {
    const onAfterRenderQuestion = (
      sender: SurveyModel,
      event: AfterRenderQuestionEvent,
    ) => {
      const question = event.question;
      const questionHtml = event.htmlElement;

      if (Result.isError(contentTokenResult)) {
        return;
      }

      const contentToken = contentTokenResult.value;

      switch (question.getType()) {
        case "file":
          if (question.value) {
            if (Array.isArray(question.value)) {
              question.value.forEach((file: File & { token?: string }) => {
                file.token = contentToken.token;
              });
            } else {
              (question.value as File & { token?: string }).token =
                contentToken.token;
            }
          }
          break;
        case "imagepicker":
          question.choices.forEach((choice: ChoiceItem) => {
            if (choice.imageLink) {
              const imgElement = questionHtml.querySelector(
                `img[src="${choice.imageLink}"]`,
              );
              if (imgElement) {
                imgElement.setAttribute(
                  "src",
                  `${choice.imageLink}?${contentToken.token}`,
                );
              }
            }
          });
          break;
        case "image":
          if (question.imageLink) {
            const imgElement = questionHtml.querySelector(
              `img[src="${question.imageLink}"]`,
            );
            if (imgElement) {
              imgElement.setAttribute(
                "src",
                `${question.imageLink}?${contentToken.token}`,
              );
            }
          }
          break;
        case "signaturepad":
          if (question.backgroundImage) {
            const imgElement = questionHtml.querySelector(
              `img[src="${question.backgroundImage}"]`,
            );
            if (imgElement) {
              imgElement.setAttribute(
                "src",
                `${question.backgroundImage}?${contentToken.token}`,
              );
            }
          }
          break;
        default:
          break;
      }
    };

    let model: SurveyModel | undefined;
    if (definition && !isLoadingQuestions) {
      model = new SurveyModel(definition);
      if (Result.isSuccess(contentTokenResult)) {
        const contentToken = contentTokenResult.value;
        if (model.logo) {
          model.logo = `${model.logo}?${contentToken.token}`;
        }
        model.onAfterRenderQuestion.add(onAfterRenderQuestion);
      }

      setSurveyModel(model);
    } else if (!definition) {
      setSurveyModel(null);
    }
    return () => {
      if (model) {
        model.onAfterRenderQuestion.remove(onAfterRenderQuestion);
      }
    };
  }, [contentTokenResult, definition, isLoadingQuestions]);

  useEffect(() => {
    if (submission && surveyModel) {
      try {
        surveyModel.data = JSON.parse(submission.jsonData);
        surveyModel.currentPageNo = submission.currentPage ?? 0;
        setFromMetadata(submission.metadata);
      } catch (error) {
        console.debug("Failed to parse submission data", error);
        setError("Failed to parse submission data");
      }
    }
  }, [setFromMetadata, submission, surveyModel]);

  return {
    surveyModel,
    isLoading: !surveyModel || isLoadingQuestions,
    error,
  };
}
