"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";

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
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  if (!definitionId) {
    return Result.error("Definition ID is required");
  }

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);
  const definition = await api.definitions.get(formId, definitionId);

  return toResult(definition, {
    mapData: (data) => ({ definitionsData: data.jsonData ?? "" }),
    fallbackMessage: "Failed to get definition",
    logMessage: "Failed to get definition",
    loggerName: "definitions.get",
  });
}
