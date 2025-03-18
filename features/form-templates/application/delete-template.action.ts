"use server";

import { ensureAuthenticated } from "@/features/auth";
import { Result } from "@/lib/result";
import { deleteFormTemplate } from "@/services/api";
import { revalidatePath } from 'next/cache';

export type DeleteFormResult = Result<string>;

export async function deleteTemplateAction(
  templateId: string,
): Promise<DeleteFormResult> {
  await ensureAuthenticated();

  try {
    const deletedTemplateId = await deleteFormTemplate(templateId);
    revalidatePath("/form-templates");
    return Result.success(deletedTemplateId);
  } catch (error) {
    console.error("Failed to delete form template", error);
    return Result.error("Failed to delete form template");
  }
}
