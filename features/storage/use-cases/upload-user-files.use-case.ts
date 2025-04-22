import { Result } from "@/lib/result";
import { v4 as uuidv4 } from "uuid";
import { optimizeImageSize } from "../infrastructure/image-service";
import {
  STORAGE_SERVICE_CONFIG,
  uploadToStorage,
} from "../infrastructure/storage-service";

export type UploadUserFilesCommand = {
  formId: string;
  submissionId?: string;
  files: { name: string; file: File }[];
};

export type UploadFileResult = {
  name: string;
  url: string;
};

export type UploadUserFilesResult = Result<UploadFileResult[]>;

const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";

export const uploadUserFilesUseCase = async ({
  formId,
  submissionId,
  files,
}: UploadUserFilesCommand): Promise<UploadUserFilesResult> => {
  if (!formId) {
    return Result.validationError("Form ID is required");
  }

  if (!submissionId) {
    return Result.validationError("Submission ID is required");
  }

  if (!files || files.length === 0) {
    return Result.validationError("Files are required");
  }

  const folderPath = `s/${formId}/${submissionId}`;

  const containerName =
    process.env.USER_FILES_STORAGE_CONTAINER_NAME ??
    DEFAULT_USER_FILES_CONTAINER_NAME;
  const uploadedFiles: UploadFileResult[] = [];

  try {
    for (const { name, file } of files) {
      let fileBuffer = Buffer.from(await file.arrayBuffer());
      if (file.type.startsWith("image/")) {
        fileBuffer = await optimizeImageSize(fileBuffer, file.type);
      }

      const uuid = uuidv4();
      const fileNameParts = file.name.split('.');
      const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop() : undefined;

      if (!fileExtension) {
        return Result.validationError(
          "File extension is required. Please provide a valid file.",
        );
      }

      const fileName = `${uuid}.${fileExtension}`;

      if (STORAGE_SERVICE_CONFIG.isEnabled) {
        const fileUrl = await uploadToStorage(
          fileBuffer,
          fileName,
          containerName,
          folderPath,
        );
        uploadedFiles.push({ name: name, url: fileUrl });
      } else {
        const base64Content = `data:${file.type};base64,${fileBuffer.toString(
          "base64",
        )}`;
        uploadedFiles.push({ name: name, url: base64Content });
      }
    }

    return Result.success(uploadedFiles);
  } catch (err) {
    return Result.error(
      "Failed to upload file. Please refresh your page and try again.",
      err instanceof Error ? err.message : "Unknown error",
    );
  }
};
