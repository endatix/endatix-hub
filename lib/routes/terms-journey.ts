import type { Route } from "next";

export const TERMS_PATH = "/accept-terms";
const workspacePath =
  /^\/(?:forms|admin|folders|data-lists|settings|my-account)(?:\/[\w-]+)*\/?$/;
const submissionFile =
  /^\/forms\/\d+\/submissions\/\d+\/files\/[\w-]+(?:%20[\w-]+)*(?:\.[\w-]+)+$/;
const navigationKeys = new Set([
  "tab",
  "page",
  "pageSize",
  "sort",
  "sortBy",
  "sortDir",
  "direction",
  "view",
]);

/** Carry only workspace navigation, never auth, respondent links or submitted values. */
export function workspaceDestination(value?: string): Route {
  if (typeof value !== "string") return "/forms";
  const [path, query] = value.split("?");
  if (!workspacePath.test(path) && !submissionFile.test(path)) return "/forms";
  const safe = new URLSearchParams();
  for (const [key, val] of new URLSearchParams(query)) {
    if (navigationKeys.has(key) && /^[\w:-]{1,40}$/.test(val))
      safe.set(key, val);
  }
  const search = safe.toString();
  return (search ? `${path}?${search}` : path) as Route;
}

export function termsVisit(source: string, scope?: string, reason?: "updated"): Route {
  if (!scope) return TERMS_PATH;
  const params = new URLSearchParams({
    returnUrl: workspaceDestination(source),
    scope,
  });
  if (reason) params.set(reason, "1");
  return `${TERMS_PATH}?${params}`;
}
