"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { getFormDefinition } from "@/services/api";

export interface GetDefinitionRequest {
  formId: string;
  definitionId?: string;
}

type DefinitionResult = {
  definitionsData: string;
};

export type SelectedDefinitionResult = Result<DefinitionResult>;

export async function getDefinitionAction({
  formId,
  definitionId,
}: GetDefinitionRequest): Promise<SelectedDefinitionResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  if (!definitionId) {
    return Result.error("Definition ID is required");
  }

  try {
    const formDefinition = await getFormDefinition(formId, definitionId);
    return Result.success({ definitionsData: formDefinition?.jsonData });
  } catch {
    return Result.error("Failed to get definition");
  }
}
