import type { Route } from "next";

/** Optional workspace pages that redirect elsewhere when their feature is disabled. */
export function resolverFeature(path: string) {
  if (path === "/accept-terms") return "terms";
  if (path === "/settings/organization/export-formats") return "reporting";
  if (/^\/forms\/[^/]+\/analytics$/.test(path)) return "analytics";
  if (/^\/forms\/[^/]+\/audience(?:\/|$)/.test(path)) return "audience";
  return null;
}

export const RESOLVER_VISIT = "required-action";

/** A reactive refusal can precede (or outlive) the host's enforcement indicator. */
export function resolverVisit(path: Route) {
  return resolverFeature(path)
    ? (`${path}?${RESOLVER_VISIT}=1` as Route)
    : path;
}
