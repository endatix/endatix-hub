import { getSession } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { toResult, type ResultType } from "@/lib/result";
import type { ActiveDefinition } from "@/types";

export type GetDefinitionQuery = {
  formId: string;
};

export const getActiveDefinitionUseCase = async ({
  formId,
}: GetDefinitionQuery): Promise<ResultType<ActiveDefinition>> => {
  const api = new EndatixApi(await getSession());
  return toResult(await api.definitions.getActive(formId), {
    fallbackMessage: "Failed to load form.",
    logMessage: "Failed to load active form definition.",
    loggerName: "public-form.definition",
  });
};