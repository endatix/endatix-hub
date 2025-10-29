"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { CreateFormRequest } from "@/features/forms/ui/chat/use-cases/assistant";
import { createForm } from "@/services/api";

export interface CreateFormDraftResult {
  isSuccess: boolean;
  error?: string;
  formId?: string;
}

export async function createFormDraft(
  request: CreateFormRequest,
): Promise<CreateFormDraftResult> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  const result: CreateFormDraftResult = {
    isSuccess: false,
  };

  if (!request) {
    result.error = "Request is null";
    return result;
  }

  try {
    const formDraft = await createForm(request);
    if (formDraft.id?.length > 0) {
      result.formId = formDraft.id;
      result.isSuccess = true;
    } else {
      result.error = "Failed to create form draft";
    }
  } catch (er) {
    result.error = `Failed to create form draft. Details: ${er}`;
  } finally {
    return result;
  }
}
