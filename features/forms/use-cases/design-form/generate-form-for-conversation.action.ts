"use server";

import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getSession } from "@/features/auth";
import { createForm } from "@/services/api";
import { z } from "zod";

type GenerateFormResult = ApiResult<string>;

const GenerateFormForConversationRequestSchema = z.object({
  formTitle: z.string().min(1, { error: "Form title is required" }),
  formDefinitionSchema: z.looseObject({}),
  conversationId: z.string(),
  agentId: z.string(),
  folderId: z.string().optional(),
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

    const settings = await endatix.tenant.getSettings();
    const requireFolder =
      settings.success && settings.data.requireFolderAssignment === true;
    const folderId = validationResult.data.folderId?.trim();

    if (requireFolder && (folderId === undefined || folderId.length === 0)) {
      return ApiResult.validationError(
        "A folder is required to create a form for this tenant.",
      );
    }

    const form = await createForm({
      name: validationResult.data.formTitle,
      isEnabled: false,
      formDefinitionJsonData: JSON.stringify(
        validationResult.data.formDefinitionSchema,
      ),
      folderId: folderId && folderId.length > 0 ? folderId : undefined,
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
