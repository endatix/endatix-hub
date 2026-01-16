"use server";

import { ContentItemType } from "../../types";
import {
  uploadContentFileUseCase,
  UploadContentFileResult,
} from "./upload-content-file.use-case";

/**
 * Server action to upload a content file (e.g., logo, image in question).
 * @param formData - The form data containing the file and itemId and itemType.
 * @returns A promise that resolves to an UploadContentFileResult.
 */
export async function uploadContentFileAction(
  formData: FormData,
): Promise<UploadContentFileResult> {
  const file = formData.get("file") as File;
  const itemId = formData.get("itemId") as string;
  const itemType = formData.get("itemType") as ContentItemType;

  return await uploadContentFileUseCase({
    itemId,
    itemType,
    file,
  });
}
