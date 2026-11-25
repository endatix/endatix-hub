import type { RequiredAction } from "@/lib/endatix-api/auth/required-action";

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
  return action.resolvePath;
}

/** Call only for a refusal (or a snapshot known to be enforced). */
export function resolveTarget(
  actions: readonly PendingAction[],
  pathname: string,
) {
  const path = pathname.replace(/\/+$/, "");
  if (path === "/signin" || path === REQUIRED_ACTIONS_PATH) return null;
  const blocking = actions.filter((a) => a.severity === "blocking");
  if (!blocking.length || blocking.some((a) => resolverPath(a) === path))
    return null;
  return blocking.map(resolverPath).find(Boolean) ?? REQUIRED_ACTIONS_PATH;
}
