import { auth } from "@/auth";
import { getClientStorageConfig } from "@/features/asset-storage/server";
import { deleteUserFiles } from "@/features/asset-storage/use-cases/delete-user-files/delete-user-files";
import { apiResponses } from "@/lib/utils/route-handlers";
import {
  authorizeFormStorageAccess,
  assertStorageObjectAccess,
  resolveStorageGateInput,
  storageGateResultToResponse,
} from "@/features/form-access";
import { Result } from "@/lib/result";

interface DeleteFilesRequest {
  formId: string;
  fileUrls: string[];
  submissionId: string;
  token?: string;
  tokenType?: "AccessToken" | "SubmissionToken";
}

export async function DELETE(request: Request) {
  const session = await auth();
  const data: DeleteFilesRequest = await request.json();
  const { formId, fileUrls, submissionId } = data;

  if (!formId) {
    return apiResponses.badRequest({ detail: "Form ID is required" });
  }

  if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
    return apiResponses.badRequest({ detail: "File URLs are required" });
  }

  if (!submissionId) {
    return apiResponses.badRequest({ detail: "Submission ID is required" });
  }

  const gate = await resolveStorageGateInput(
    {
      formId,
      submissionId,
      token: data.token,
      tokenType: data.tokenType,
    },
    { allowCookieFallback: !session?.accessToken },
  );

  const accessResult = await authorizeFormStorageAccess(gate, {
    hubAccessToken: session?.accessToken,
  });
  
  if (Result.isError(accessResult)) {
    return storageGateResultToResponse(accessResult)!;
  }

  if (!accessResult.value.canDeleteFiles) {
    return apiResponses.forbidden({ detail: "File delete is not permitted" });
  }

  const clientConfig = getClientStorageConfig();
  const access = accessResult.value;

  try {
    const results = await deleteUserFiles({
      fileUrls,
      clientConfig,
      assertObject: (parsed) =>
        assertStorageObjectAccess(parsed, access, clientConfig),
    });

    return Response.json({
      message: "Delete operation completed",
      results,
    });
  } catch (error) {
    console.error("Error in deleteFiles:", error);
    return apiResponses.serverError({
      detail: "Internal server error during file deletion",
    });
  }
}
