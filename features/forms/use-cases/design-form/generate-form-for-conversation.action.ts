"use server";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getSession } from "@/features/auth";
import { createForm } from "@/services/api";
import { z } from "zod";

type GenerateFormResult = ApiResult<string>;

const GenerateFormForConversationRequestSchema = z.object({
  formTitle: z.string().min(1, { message: "Form title is required" }),
  formDefinitionSchema: z.object({}).passthrough(),
  conversationId: z.string(),
  agentId: z.string(),
});

type GenerateFormForConversationRequest = z.infer<
  typeof GenerateFormForConversationRequestSchema
>;

export async function generateFormForConversationAction(
  request: GenerateFormForConversationRequest,
): Promise<GenerateFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await getSession();
  const endatix = new EndatixApi(session);

  try {
    const validationResult =
      GenerateFormForConversationRequestSchema.safeParse(request);
    if (!validationResult.success) {
      return ApiResult.validationError(validationResult.error.message);
    }

    const form = await createForm({
      name: validationResult.data.formTitle,
      isEnabled: false,
      formDefinitionJsonData: JSON.stringify(
        validationResult.data.formDefinitionSchema,
      ),
    });

    if (!form?.id || form.id.length === 0) {
      return ApiResult.serverError("Failed to create form");
    }

    const partialUpdateConversationResult =
      await endatix.conversations.partialUpdateConversation({
        agentId: validationResult.data.agentId,
        conversationId: validationResult.data.conversationId,
        formId: form.id,
        title: validationResult.data.formTitle,
      });

    if (partialUpdateConversationResult.success) {
      return ApiResult.success(form.id);
    }

    return partialUpdateConversationResult;
  } catch (error) {
    console.error("Failed to create form", error);
    return ApiResult.serverError("Failed to create form");
  }
}
