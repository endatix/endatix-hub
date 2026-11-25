import type { RequiredAction } from "@/lib/endatix-api/auth/required-action";
import type { Route } from "next";

export const REQUIRED_ACTIONS_PATH = "/required-actions";
type PendingAction = Pick<
  RequiredAction,
  "severity" | "resolvePath" | "canResolve"
>;

/** Providers supply an application path, never an origin, redirect query or API URL. */
export function resolverPath(
  action: Pick<PendingAction, "canResolve" | "resolvePath">,
) {
  if (!action.canResolve || !/^\/[\w-]+(?:\/[\w-]+)*$/.test(action.resolvePath))
    return null;
  if (
    /^\/(?:api|_next|signin|signout|required-actions)(?:\/|$)/i.test(
      action.resolvePath,
    )
  )
    return null;
  // A module supplies its route at runtime; Next's generated union cannot name it here.
  return action.resolvePath as Route;
}

/** Call only for a refusal (or a snapshot known to be enforced). */
export function resolveTarget(
  actions: readonly PendingAction[],
  pathname: string,
) {
  const path = pathname.replace(/\/+$/, "");
  if (isSignInPath(path) || path === REQUIRED_ACTIONS_PATH) return null;
  const blocking = actions.filter((a) => a.severity === "blocking");
  if (!blocking.length || blocking.some((a) => a.resolvePath === path))
    return null;
  return firstResolverPath(blocking) ?? REQUIRED_ACTIONS_PATH;
}

function isSignInPath(path: string) {
  return path === "/signin" || /^\/t\/[^/]+\/signin$/.test(path);
}

export function firstResolverPath(blocking: readonly PendingAction[]) {
  return blocking.map((action) => resolverPath(action)).find(Boolean);
}
