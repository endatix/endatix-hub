import { Result } from "@/lib/result";
import { v4 as uuidv4 } from "uuid";
import { uploadToStorage } from "../infrastructure/storage-service";
import { optimizeImageSize } from "../infrastructure/image-service";
import {
  getContainerNames,
  getStorageConfig,
} from "../infrastructure/storage-config";

export type UploadContentFileCommand = {
  formId: string;
  file: File;
};

export type UploadFileResult = {
  name: string;
  url: string;
};

export type UploadContentFileResult = Result<UploadFileResult>;

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
  const containerNames = getContainerNames();
  const storageConfig = getStorageConfig();
  const containerName = containerNames.CONTENT;
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
    if (storageConfig.isEnabled) {
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
