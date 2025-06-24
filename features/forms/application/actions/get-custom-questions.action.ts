"use server";

import { getCustomQuestions, CustomQuestion } from "@/services/api";
import { Result } from "@/lib/result";

export async function getCustomQuestionsAction(): Promise<
  Result<CustomQuestion[]>
> {
  try {
    const questions = await getCustomQuestions();
    return Result.success(questions);
  } catch (error) {
    console.error("Failed to fetch custom questions:", error);
    return Result.error("Failed to fetch custom questions");
  }
}
