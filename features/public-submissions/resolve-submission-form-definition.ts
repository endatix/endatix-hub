import type { Submission } from "@/lib/endatix-api";
import { Result, type ResultType } from "@/lib/result";
import type { ActiveDefinition } from "@/types";

/**
 * Resolve the form definition for a submission.
 * @param submission - The submission to resolve the form definition for.
 * @returns The resolved form definition.
 */
export function resolveSubmissionFormDefinition(
  submission: Submission,
): ResultType<ActiveDefinition> {
  const formDefinition = submission.formDefinition;
  const jsonData = formDefinition?.jsonData?.trim();

  if (!formDefinition || !jsonData) {
    return Result.error("Submission form definition is missing.");
  }

  return Result.success({
    ...formDefinition,
    id: resolveNonEmptyValue(formDefinition.id, submission.formDefinitionId),
    formId: resolveNonEmptyValue(formDefinition.formId, submission.formId),
    isActive: formDefinition.isActive ?? true,
    isDraft: formDefinition.isDraft ?? false,
    jsonData,
    createdAt: formDefinition.createdAt ?? submission.createdAt,
    modifiedAt:
      formDefinition.modifiedAt ?? formDefinition.createdAt ?? submission.createdAt,
    customQuestions: formDefinition.customQuestions ?? [],
    requiresReCaptcha: formDefinition.requiresReCaptcha ?? false,
    limitOnePerUser: formDefinition.limitOnePerUser ?? false,
  });
}

function resolveNonEmptyValue(
  value: string | undefined,
  fallback: string,
): string {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : fallback;
}
