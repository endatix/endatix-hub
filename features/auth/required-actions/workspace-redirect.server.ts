import type { Session } from "next-auth";
import { EndatixApi } from "@/lib/endatix-api";
import { RESOLVER_VISIT } from "@/lib/routes/optional-resolver";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import {
  REQUIRED_ACTIONS_PATH,
  resolveTarget,
} from "@/lib/routes/resolve-target";
import { HUB_PATHS } from "../infrastructure/auth-constants";
import {
  availableResolvers,
  resolverAvailable,
} from "./available-resolvers.server";

/** Read the serving host on navigation; the Hub's role cache can outlive a change of standing. */
export async function workspaceRedirect(
  session: Session | null,
  { pathname: path, searchParams }: Pick<URL, "pathname" | "searchParams">,
) {
  if (!session?.accessToken || session.error || !isWorkspacePage(path))
    return null;
  if (
    searchParams.get(RESOLVER_VISIT) === "1" &&
    !(await resolverAvailable(path))
  )
    return REQUIRED_ACTIONS_PATH;
  const api = new EndatixApi(session.accessToken);
  const current = await api.auth.getAuthorizationData();
  if (!current.success || current.data.requiredActionsEnforced !== true)
    return null;
  const actions = requiredActionsSchema.safeParse(current.data.requiredActions);
  return actions.success
    ? resolveTarget(await availableResolvers(actions.data), path)
    : null;
}

function isWorkspacePage(path: string) {
  // The repair page checks PlatformAdmin itself, even with a pending action.
  if (path === "/admin/legal") return false;
  if (path === "/") return true;
  return HUB_PATHS.some(
    (root) =>
      root !== REQUIRED_ACTIONS_PATH &&
      (path === root || path.startsWith(`${root}/`)),
  );
}
