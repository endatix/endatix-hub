"use server";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  DefineFormRequestSchema,
  DefineFormRequest,
  DefineFormResponse,
} from "@/lib/endatix-api/agents/types";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  trackException,
  trackEvent,
} from "@/features/analytics/posthog/server";

type PromptResult = ApiResult<DefineFormResponse>;

const PromptResult = {
  Success(data: DefineFormResponse): PromptResult {
    return ApiResult.success(data);
  },

  Error(message: string): PromptResult {
    return ApiResult.validationError(message);
  },
};

export async function defineFormAction(
  request: DefineFormRequest,
): Promise<PromptResult | never> {
  try {
    const session = await auth();
    const { requireHubAccess } = await authorization(session);
    await requireHubAccess();

    const validationResult = DefineFormRequestSchema.safeParse(request);
    if (!validationResult.success) {
      return PromptResult.Error(
        `Validation failed: ${validationResult.error.errors
          .map((e) => e.message)
          .join(", ")}`,
      );
    }

    const endatixApi = new EndatixApi(session?.accessToken);
    const defineFormResult = await endatixApi.agents.defineForm(
      validationResult.data,
    );

    if (ApiResult.isError(defineFormResult)) {
      await trackException(defineFormResult.error.message, {
        operation: "define_form",
        form_id: request.formId || "unknown",
        timestamp: new Date().toISOString(),
      });

      return PromptResult.Error(defineFormResult.error.message);
    }

    const promptResponse = defineFormResult.data;
    await trackEvent("form_defined", {
      form_id: request.formId || "unknown",
      thread_id: promptResponse.threadId,
      agent_id: promptResponse.agentId,
      has_definition: !!promptResponse.agentResponse.definition,
      definition_size: promptResponse.agentResponse.definition?.length ?? 0,
      timestamp: new Date().toISOString(),
    });

    return PromptResult.Success(defineFormResult.data);
  } catch (error) {
    await trackException(error, {
      operation: "define_form",
      form_id: request.formId || "unknown",
      timestamp: new Date().toISOString(),
    });

    return PromptResult.Error(
      error instanceof Error ? error.message : "An unexpected error occurred",
    );
  }
}
