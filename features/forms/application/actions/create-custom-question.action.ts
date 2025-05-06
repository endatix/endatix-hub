"use server";

import { createCustomQuestion, CreateCustomQuestionRequest, CustomQuestion } from "@/services/api";
import { Result } from "@/lib/result";

export async function createCustomQuestionAction(request: CreateCustomQuestionRequest): Promise<Result<CustomQuestion>> {
  try {
    const question = await createCustomQuestion(request);
    return Result.success(question);
  } catch (error) {
    console.error("Failed to create custom question:", error);
    return Result.error("Failed to create custom question");
  }
} 