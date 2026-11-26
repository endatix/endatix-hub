import type { Route } from "next";
import { normalizeBasePath } from "@/lib/hosting/base-path";
import { resolverVisit } from "./optional-resolver";
import { TERMS_PATH, termsVisit } from "./terms-journey";

export function displayedResolver(target: Route) {
  if (target !== TERMS_PATH || typeof window === "undefined")
    return resolverVisit(target);
  const page =
    window.location.pathname.slice(normalizeBasePath().length) +
    window.location.search;
  const scope = document.querySelector<HTMLElement>("[data-workspace-scope]")
    ?.dataset.workspaceScope;
  return termsVisit(page, scope);
}
