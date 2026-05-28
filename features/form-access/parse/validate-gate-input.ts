import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { FormStorageGateInput } from "../types";

/** Validates respondent gate login inputs (formId required; submissionId optional). */
export function validateGateInput(
  gate: FormStorageGateInput,
): Result<FormStorageGateInput> {
  const formIdResult = validateEndatixId(gate.formId, "formId");
  if (Result.isError(formIdResult)) {
    return formIdResult;
  }

  if (gate.submissionId) {
    const submissionIdResult = validateEndatixId(
      gate.submissionId,
      "submissionId",
    );

    if (Result.isError(submissionIdResult)) {
      return submissionIdResult;
    }

    return Result.success({
      ...gate,
      formId: formIdResult.value,
      submissionId: submissionIdResult.value,
    });
  }

  return Result.success({
    ...gate,
    formId: formIdResult.value,
  });
}
