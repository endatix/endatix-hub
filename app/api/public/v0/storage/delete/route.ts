import { getContainerNames } from "@/features/storage/infrastructure/storage-config";
import {
  deleteBlob,
  FileOptions,
} from "@/features/storage/infrastructure/storage-service";

interface DeleteFilesRequest {
  formId: string;
  fileUrls: string[];
  submissionId: string;
}

export async function DELETE(request: Request) {
  const data: DeleteFilesRequest = await request.json();
  const { formId, fileUrls, submissionId } = data;

  if (!formId) {
    return Response.json({ error: "Form ID is required" }, { status: 400 });
  }

  if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
    return Response.json({ error: "File URLs are required" }, { status: 400 });
  }

  if (!submissionId) {
    return Response.json(
      { error: "Submission ID is required" },
      { status: 400 },
    );
  }

  const containerNames = getContainerNames();
  const containerName = containerNames.USER_FILES;
  const folderPath = `s/${formId}/${submissionId}`;

  try {
    const deleteResults = await Promise.all(
      fileUrls.map(async (fileUrl) => {
        try {
          const folderPathIndex = fileUrl.indexOf(folderPath);
          if (folderPathIndex === -1) {
            return {
              fileUrl,
              result: "error",
              error: "File URL does not match expected folder path",
            };
          }

          const fileName = fileUrl
            .substring(folderPathIndex + folderPath.length)
            .split("/")
            .pop();

          if (!fileName) {
            return {
              fileUrl,
              result: "error",
              error: "Could not extract filename from URL",
            };
          }

          const fileOptions: FileOptions = {
            containerName,
            fileName,
            folderPath,
          };

          await deleteBlob(fileOptions);
          return {
            fileUrl,
            result: "success",
          };
        } catch (error) {
          return {
            fileUrl,
            result: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    return Response.json({
      message: "Delete operation completed",
      results: deleteResults,
    });
  } catch (error) {
    console.error("Error in delete operation:", error);
    return Response.json(
      { error: "Internal server error during file deletion" },
      { status: 500 },
    );
  }
}
