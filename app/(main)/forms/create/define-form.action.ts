"use server";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getSession } from "@/features/auth";
import {
  DefineFormRequestSchema,
  DefineFormRequest,
} from "@/lib/endatix-api/agents/types";
import { PromptResult } from "@/app/(main)/forms/create/prompt-result";
import { Model } from "survey-core";

function buildDefineFormRequest(formData: FormData): DefineFormRequest {
  const request: DefineFormRequest = {
    prompt: formData.get("prompt") as string,
  };

  const definition = formData.get("definition") as string;
  if (definition?.trim()) {
    request.definition = definition;
  }

  const threadId = formData.get("threadId") as string;
  if (threadId?.trim()) {
    request.threadId = threadId;
  }

  return request;
}

export async function defineFormAction(
  prevState: PromptResult,
  formData: FormData,
): Promise<PromptResult> {
  const request = buildDefineFormRequest(formData);

  const validationResult = DefineFormRequestSchema.safeParse(request);
  if (!validationResult.success) {
    return PromptResult.Error(
      `Validation failed: ${validationResult.error.errors
        .map((e) => e.message)
        .join(", ")}`,
    );
  }

  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const result = await endatixApi.agents.defineForm(validationResult.data);

  if (ApiResult.isError(result)) {
    return PromptResult.Error(result.error.message);
  }

  try {
    const validatedModel = new Model(result.data.definition);
    result.data.definition = validatedModel.toJSON();

    return PromptResult.Success(result.data);
  } catch (error) {
    return PromptResult.Error(
      error instanceof Error ? error.message : "An unexpected error occurred",
    );
  }
}
