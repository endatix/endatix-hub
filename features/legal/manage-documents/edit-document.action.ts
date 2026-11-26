"use server";
import { revalidatePath } from "next/cache";
import { Result, toResult } from "@/lib/result";
import { documentApi, documentsPath, options, writeDocument } from "./document-api.server";
import { documentKind, editSchema, type DocumentKind, type DocumentState, type Edit } from "./documents";

export async function editDocument(input: Edit) {
  const api = await documentApi();
  if (!api) return Result.error<DocumentState>("Legal management is disabled.");
  const edit = editSchema.safeParse(input);
  if (!edit.success) return Result.validationError<DocumentState>("Invalid legal document edit.");
  const result = toResult(await writeDocument(api, edit.data), options);
  if (Result.isSuccess(result)) revalidatePath("/admin/legal");
  return result;
}

export async function previewDraft(kind: DocumentKind) {
  const api = await documentApi();
  if (!api || !documentKind.safeParse(kind).success)
    return Result.error<DocumentState>("Legal preview is unavailable.");
  return toResult(await api.get<DocumentState>(`${documentsPath}/${kind}/preview`), options);
}
