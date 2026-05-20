import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { getClientStorageConfig } from "@/features/asset-storage/storage-runtime";
import { deleteUserFiles } from "@/features/asset-storage/use-cases/delete-user-files/delete-user-files";
import { assertHubObjectAccess } from "@/features/form-access/server";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Permissions } from "@/features/auth/authorization/domain/permissions";

interface HubDeleteFilesRequest {
  formId?: string;
  submissionId?: string;
  fileUrls?: unknown;
}

/**
 * Batch-delete submission user-files for authenticated Hub users (submission edit, review).
 */
export async function DELETE(request: Request): Promise<Response> {
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);

  const isAllowedCheck = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Submissions.Edit,
  ]);

  if (!isAllowedCheck.success) {
    return apiResponses.forbidden({ detail: "Forbidden" });
  }

  let data: HubDeleteFilesRequest;
  try {
    data = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  if (!data.formId?.trim()) {
    return apiResponses.badRequest({ detail: "Form ID is required" });
  }

  const formIdResult = validateEndatixId(data.formId.trim(), "formId");
  if (Result.isError(formIdResult)) {
    return apiResponses.badRequest({ detail: formIdResult.message });
  }

  if (!data.submissionId?.trim()) {
    return apiResponses.badRequest({ detail: "Submission ID is required" });
  }

  const submissionIdResult = validateEndatixId(
    data.submissionId.trim(),
    "submissionId",
  );
  if (Result.isError(submissionIdResult)) {
    return apiResponses.badRequest({ detail: submissionIdResult.message });
  }

  if (!Array.isArray(data.fileUrls) || data.fileUrls.length === 0) {
    return apiResponses.badRequest({ detail: "File URLs are required" });
  }

  if (!data.fileUrls.every((url) => typeof url === "string")) {
    return apiResponses.badRequest({ detail: "File URLs must be strings" });
  }

  const fileUrls = data.fileUrls as string[];
  const scope = {
    formId: formIdResult.value,
    submissionId: submissionIdResult.value,
  };

  const clientConfig = getClientStorageConfig();

  try {
    const results = await deleteUserFiles({
      fileUrls,
      clientConfig,
      assertObject: (parsed) =>
        assertHubObjectAccess(parsed, scope, clientConfig),
    });

    return Response.json({
      message: "Delete operation completed",
      results,
    });
  } catch (error) {
    console.error("Error in hub deleteFiles:", error);
    return apiResponses.serverError({
      detail: "Internal server error during file deletion",
    });
  }
}
