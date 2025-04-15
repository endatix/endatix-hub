import { ActiveDefinition } from "@/types";
import { getActiveFormDefinition } from "@/services/api";
import { Result } from "@/lib/result";

export type GetDefinitionQuery = {
  formId: string;
};

export const getActiveDefinitionUseCase = async ({
  formId,
}: GetDefinitionQuery): Promise<Result<ActiveDefinition>> => {
  try {
    const response: ActiveDefinition = await getActiveFormDefinition(
      formId,
      true,
    );
    return Result.success(response);
  } catch (error) {
    const errorMessage = `Failed to load form: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);

    return Result.error(errorMessage);
  }
};
