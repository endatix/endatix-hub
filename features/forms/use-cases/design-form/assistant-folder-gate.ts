/**
 * Validates assistant-driven form creation against tenant folder-assignment policy.
 * Returns an error message when creation must not proceed, or null when allowed.
 */
export function resolveAssistantFolderGateError(
  requireFolderForNewForms: boolean,
  assignableFolders: readonly { id: string }[],
  assignFolderId: string | undefined,
): string | null {
  if (requireFolderForNewForms && assignableFolders.length === 0) {
    return "No folders are available. Create a folder before using the assistant.";
  }

  if (
    requireFolderForNewForms &&
    assignableFolders.length > 0 &&
    (assignFolderId === undefined || assignFolderId.length === 0)
  ) {
    return "Select a folder before creating the form (required by your organization).";
  }

  return null;
}
