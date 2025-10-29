"use server";

import { getCustomQuestions, CustomQuestion } from "@/services/api";
import { Result } from "@/lib/result";
import { createPermissionService } from "@/features/auth/permissions/application";

export async function getCustomQuestionsAction(): Promise<
  Result<CustomQuestion[]> | never
> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const questions = await getCustomQuestions();
    return Result.success(questions);
  } catch (error) {
    console.error("Failed to fetch custom questions:", error);
    return Result.error("Failed to fetch custom questions");
  }
}
