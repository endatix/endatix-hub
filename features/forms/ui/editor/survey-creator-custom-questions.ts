"use client";

import { toast } from "@/components/ui/toast";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { Result } from "@/lib/result";
import type { SurveyCreator } from "survey-creator-react";

type QuestionClassWithCustomize = {
  customizeEditor: (creator: SurveyCreator) => void;
};

/**
 * Registers custom question classes on an existing Survey Creator instance.
 */
export function customizeQuestionClassesOnCreator(
  creator: SurveyCreator | null,
  questionClasses: readonly QuestionClassWithCustomize[],
): void {
  if (!creator) {
    return;
  }

  questionClasses.forEach((QuestionClass) => {
    QuestionClass.customizeEditor(creator);
  });
}

/**
 * Fetches custom question definitions from the API and builds SurveyJS question classes.
 *
 * @returns `null` when the request could not be started (toast already shown). Throws if the API returns an error result.
 */
export async function loadBuiltInCustomQuestionClasses(): Promise<
  ReturnType<typeof initializeCustomQuestions> | null
> {
  const result = await getCustomQuestionsAction();

  if (result === undefined) {
    toast.error("Could not proceed with fetching custom questions");
    return null;
  }

  if (Result.isError(result)) {
    throw new Error(result.message);
  }

  return initializeCustomQuestions(
    result.value.map((q) => q.jsonData),
  );
}
