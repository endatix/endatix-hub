import { Result } from "@/lib/result";
import { optimizeImageSize } from "../../infrastructure/image-service";
import { uploadToStorage } from "../../infrastructure/storage-service";
import { generateUniqueFileName } from "../../utils";
import {
  getContainerNames,
  getStorageConfig,
} from "../../infrastructure/storage-config";
import {
  UploadFileResult,
  UploadUserFilesCommand,
  UploadUserFilesResult,
} from "../../types";
import { buildUseFileFolderPath } from "../../infrastructure/storage-utils";

const uploadUserFilesUseCase = async ({
  formId,
  submissionId,
  files,
  additionalMetadata,
}: UploadUserFilesCommand): Promise<UploadUserFilesResult> => {
  const folderPathResult = buildUseFileFolderPath(formId, submissionId);
  if (Result.isError(folderPathResult)) {
    return Result.error(folderPathResult.message);
  }

  if (!files || files.length === 0) {
    return Result.validationError("Files are required");
  }

  const folderPath = folderPathResult.value;
  const containerNames = getContainerNames();
  const storageConfig = getStorageConfig();
  const containerName = containerNames.USER_FILES;
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
      const fileMetadata = {
        ...additionalMetadata,
        contentType: file.type,
        fileName: file.name,
      };

      if (storageConfig.isEnabled) {
        const fileUrl = await uploadToStorage(
          fileBuffer,
          fileName,
          containerName,
          folderPath,
          fileMetadata,
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

export { uploadUserFilesUseCase };
