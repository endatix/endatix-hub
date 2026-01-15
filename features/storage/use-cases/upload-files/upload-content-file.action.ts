"use server";

import {
  uploadContentFileUseCase,
  UploadContentFileResult,
} from "./upload-content-file.use-case";

/**
 * Server action to upload a content file (e.g., logo, image in question).
 * @param formData - The form data containing the file and formId.
 * @returns A promise that resolves to an UploadContentFileResult.
 */
export async function uploadContentFileAction(
  formData: FormData,
): Promise<UploadContentFileResult> {
  const file = formData.get("file") as File;
  const formId = formData.get("formId") as string;

  return await uploadContentFileUseCase({
    formId,
    file,
  });
}
