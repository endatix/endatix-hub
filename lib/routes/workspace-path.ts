const workspacePath =
  /^\/(?:forms|admin|folders|data-lists|settings|my-account)(?:\/[\w-]+)*\/?$/;
const filePage = /^\/forms\/([^/]+)\/submissions\/([^/]+)\/files\/(.+)$/;
const decimalId = /^[1-9]\d*$/;

export function submissionFilePath(
  formId: string,
  submissionId: string,
  name: string,
) {
  return `/forms/${formId}/submissions/${submissionId}/files/${encodeURIComponent(name)}` as const;
}

/** A file page can carry one encoded name. Other workspace routes keep their own path grammar. */
export function isWorkspaceDestinationPath(path: string) {
  const file = filePage.exec(path);
  if (!file) return workspacePath.test(path);
  const [, formId, submissionId, segment] = file;
  if (!decimalId.test(formId) || !decimalId.test(submissionId)) return false;
  try {
    const name = decodeURIComponent(segment);
    if (!isSingleFileName(name)) return false;
    return path === submissionFilePath(formId, submissionId, name);
  } catch {
    return false;
  }
}

function isSingleFileName(name: string) {
  // The file page reads a decoded name. Never admit another escape, separator or dot segment.
  return (
    !!name.trim() &&
    name !== "." &&
    name !== ".." &&
    !/[/%\\\p{Cc}]/u.test(name)
  );
}
