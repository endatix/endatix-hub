import { Result } from "@/lib/result";
import { v4 as uuidv4 } from "uuid";

function generateUniqueFileName(fileName: string): Result<string> {
  if (!fileName) {
    return Result.validationError("File name is required");
  }

  const uuid = uuidv4();
  const fileNameParts = fileName.split(".");
  const fileExtension =
    fileNameParts.length > 1 ? fileNameParts.pop() : undefined;

  if (!fileExtension) {
    return Result.validationError(
      "File extension is required. Please provide a valid file.",
    );
  }

  return Result.success(`${uuid}.${fileExtension}`);
}

export { generateUniqueFileName };
