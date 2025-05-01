"use server";

import { defineForm } from "@/services/ai-api";
import {
  PromptResult,
  IPromptResult,
} from "@/app/(main)/forms/create/prompt-result";
import { Model } from "survey-core";
import { DefineFormRequest } from "@/app/(main)/forms/create/use-cases/assistant";

export async function defineFormAction(
  prevState: IPromptResult,
  formData: FormData,
): Promise<IPromptResult> {
  const prompt = formData.get("prompt");
  const threadId = formData.get("threadId");
  const assistantId = formData.get("assistantId");

  try {
    const request = {
      prompt: prompt as string,
    } as DefineFormRequest;

    if (threadId && assistantId) {
      request.threadId = threadId as string;
      request.assistantId = assistantId as string;
    }

    const response = await defineForm(request);

    const validatedModel = new Model(response.definition);
    response.definition = validatedModel.toJSON();

    return PromptResult.Success(response);
  } catch {
    return PromptResult.Error(
      "Failed to process your prompt. Please try again and if the issue persists, contact support.",
    );
  }
}
