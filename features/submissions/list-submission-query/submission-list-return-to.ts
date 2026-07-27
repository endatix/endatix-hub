import { buildSubmissionListPath } from "./build-submission-list-path";
import { parseSubmissionListSearchParams } from "./parse-submission-list-search-params";
import { serializeSubmissionListSearchParams } from "./serialize-submission-list-search-params";

function storageKey(formId: string): string {
  return `ehx_submissions_list_return_${formId}`;
}

/**
 * Persists the submissions list search string for a form so detail/edit "Back"
 * can restore paging and filters. Values are re-parsed for safety.
 */
export function rememberSubmissionListReturnTo(
  formId: string,
  search: string,
): void {
  if (globalThis.window === undefined || !formId.trim()) {
    return;
  }

  const query = search.startsWith("?") ? search.slice(1) : search;
  const state = parseSubmissionListSearchParams(
    Object.fromEntries(new URLSearchParams(query)),
  );
  const serialized = serializeSubmissionListSearchParams(state).toString();

  try {
    globalThis.sessionStorage.setItem(storageKey(formId), serialized);
  } catch {
    // Quota / private mode — ignore; Back falls back to bare list path.
  }
}

/**
 * Builds `/forms/:formId/submissions` including last remembered list query.
 */
export function getSubmissionListReturnPath(formId: string): string {
  const fallback = `/forms/${formId}/submissions`;
  if (globalThis.window === undefined || !formId.trim()) {
    return fallback;
  }

  try {
    const stored = globalThis.sessionStorage.getItem(storageKey(formId));
    if (stored == null || stored.trim() === "") {
      return fallback;
    }

    const state = parseSubmissionListSearchParams(
      Object.fromEntries(new URLSearchParams(stored)),
    );
    return buildSubmissionListPath(formId, state);
  } catch {
    return fallback;
  }
}

export function clearSubmissionListReturnTo(formId: string): void {
  if (globalThis.window === undefined || !formId.trim()) {
    return;
  }

  try {
    globalThis.sessionStorage.removeItem(storageKey(formId));
  } catch {
    // ignore
  }
}
