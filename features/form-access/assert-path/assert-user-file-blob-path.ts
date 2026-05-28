import { USER_FILES_PREFIX } from "@/features/asset-storage/infrastructure/storage-utils";

/** Asserts that a user file blob path is scoped to a form and submission. */
export function assertUserFileBlobPath(
  blobName: string,
  scope: { formId: string; submissionId?: string },
  options: { requireSubmission: boolean },
): string | null {
  const expectedFormPrefix = `${USER_FILES_PREFIX}${scope.formId}/`;
  if (!blobName.startsWith(expectedFormPrefix)) {
    return "File is not scoped to this form";
  }

  if (options.requireSubmission && !scope.submissionId) {
    return "Submission context is required for user file access";
  }

  if (scope.submissionId) {
    const expectedSubmissionPrefix = `${expectedFormPrefix}${scope.submissionId}/`;
    if (!blobName.startsWith(expectedSubmissionPrefix)) {
      return "File is not scoped to this submission";
    }
  }

  return null;
}
