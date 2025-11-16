"use server";

import {
  createCustomQuestion,
  CreateCustomQuestionRequest,
  CustomQuestion,
} from "@/services/api";
import { Result } from "@/lib/result";
import { authorization } from "@/features/auth/permissions";

export async function createCustomQuestionAction(
  request: CreateCustomQuestionRequest,
): Promise<Result<CustomQuestion> | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const question = await createCustomQuestion(request);
    return Result.success(question);
  } catch (error) {
    console.error("Failed to create custom question:", error);
    return Result.error("Failed to create custom question");
  }
}
