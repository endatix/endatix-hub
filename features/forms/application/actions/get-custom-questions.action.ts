"use server";

import { getCustomQuestions, CustomQuestion } from "@/services/api";
import { Result } from "@/lib/result";
import { authorization } from "@/features/auth/authorization";

export async function getCustomQuestionsAction(): Promise<
  Result<CustomQuestion[]> | never
> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const questions = await getCustomQuestions();
    return Result.success(questions);
  } catch (error) {
    console.error("Failed to fetch custom questions:", error);
    return Result.error("Failed to fetch custom questions");
  }
}
