import { Result } from "@/lib/result";
import { v4 as uuidv4 } from "uuid";
import {
  STORAGE_SERVICE_CONFIG,
  uploadToStorage,
} from "../infrastructure/storage-service";
import { optimizeImageSize } from "../infrastructure/image-service";

export type UploadContentFileCommand = {
  formId: string;
  file: File;
};

export type UploadFileResult = {
  name: string;
  url: string;
};

export type UploadContentFileResult = Result<UploadFileResult>;

const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

export const uploadContentFileUseCase = async ({
  formId,
  file,
}: UploadContentFileCommand): Promise<UploadContentFileResult> => {
  if (!formId) {
    return Result.validationError("Form ID is required");
  }

  if (!file) {
    return Result.validationError("File is required");
  }

  const folderPath = `f/${formId}`;
  const containerName =
    process.env.CONTENT_STORAGE_CONTAINER_NAME ??
    DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME;

  try {
    let fileBuffer = Buffer.from(await file.arrayBuffer());

    if (file.type.startsWith("image/")) {
      const optimizedBuffer = await optimizeImageSize(fileBuffer, file.type);
      fileBuffer = Buffer.from(optimizedBuffer);
    }

    const uuid = uuidv4();
    const fileNameParts = file.name.split(".");
    const fileExtension =
      fileNameParts.length > 1 ? fileNameParts.pop() : undefined;

    if (!fileExtension) {
      return Result.validationError(
        "File extension is required. Please provide a valid file.",
      );
    }

    const fileName = `${uuid}.${fileExtension}`;
    let fileUrl: string = "";
    if (STORAGE_SERVICE_CONFIG.isEnabled) {
      fileUrl = await uploadToStorage(
        fileBuffer,
        fileName,
        containerName,
        folderPath,
      );
    } else {
      fileUrl = `data:${file.type};base64,${fileBuffer.toString("base64")}`;
    }

    return Result.success({
      name: file.name,
      url: fileUrl,
    });
  } catch (err) {
    return Result.error(
      "Failed to upload file",
      err instanceof Error ? err.message : "Unknown error",
    );
  }
};
