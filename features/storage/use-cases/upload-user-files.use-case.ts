import { Result } from "@/lib/result";
import { optimizeImageSize } from "../infrastructure/image-service";
import {
  STORAGE_SERVICE_CONFIG,
  uploadToStorage,
} from "../infrastructure/storage-service";
import { generateUniqueFileName } from "../utils";

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
        const optimizedBuffer = await optimizeImageSize(fileBuffer, file.type);
        fileBuffer = Buffer.from(optimizedBuffer);
      }

      const initialFileNameResult = generateUniqueFileName(file.name);

      if (Result.isError(initialFileNameResult)) {
        return Result.error(initialFileNameResult.message);
      }

      const fileName = initialFileNameResult.value;

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
