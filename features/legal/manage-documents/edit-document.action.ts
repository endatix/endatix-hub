"use server";
import { revalidatePath } from "next/cache";
import { Result } from "@/lib/result";
import { invalidateLegalFooter } from "../public-links.server";
import { confirmedDocument, documentApi, documentsPath, writeDocument } from "./document-api.server";
import { documentKind, editSchema, type DocumentKind, type DocumentState, type Edit } from "./documents";

export async function editDocument(input: Edit) {
  const api = await documentApi();
  if (!api) return Result.error<DocumentState>("Legal management is disabled.");
  const edit = editSchema.safeParse(input);
  if (!edit.success) return Result.validationError<DocumentState>("Invalid legal document edit.");
  const result = confirmedDocument(await writeDocument(api, edit.data), edit.data.kind);
  if (Result.isSuccess(result)) {
    if (edit.data.operation === "publish") invalidateLegalFooter();
    revalidatePath("/admin/legal");
  }
  return result;
}

export async function previewDraft(kind: DocumentKind) {
  const api = await documentApi();
  if (!api || !documentKind.safeParse(kind).success)
    return Result.error<DocumentState>("Legal preview is unavailable.");
  return confirmedDocument(await api.get<unknown>(`${documentsPath}/${kind}/preview`), kind);
}
