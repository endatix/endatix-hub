"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/permissions";
import { Result } from "@/lib/result";
import { updateForm } from "@/services/api";
import { revalidatePath } from "next/cache";

export type UpdateFormNameResult = Result<string>;

export async function updateFormNameAction(
  formId: string,
  formName: string,
): Promise<UpdateFormNameResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  try {
    await updateForm(formId, { name: formName });
    revalidatePath(`/(main)/forms/${formId}/design`);

    return Result.success(formId);
  } catch (error) {
    console.error("Failed to update form name", error);
    return Result.error("Failed to update form name");
  }
}
