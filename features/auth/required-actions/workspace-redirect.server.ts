import type { Session } from "next-auth";
import { EndatixApi } from "@/lib/endatix-api";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import {
  REQUIRED_ACTIONS_PATH,
  resolveTarget,
} from "@/lib/routes/resolve-target";
import { HUB_PATHS } from "../infrastructure/auth-constants";

/** Read the serving host on navigation; the Hub's role cache can outlive a change of standing. */
export async function workspaceRedirect(session: Session | null, path: string) {
  if (!session?.accessToken || session.error || !isWorkspacePage(path))
    return null;
  const api = new EndatixApi(session.accessToken);
  const current = await api.auth.getAuthorizationData();
  if (!current.success || current.data.requiredActionsEnforced !== true)
    return null;
  const actions = requiredActionsSchema.safeParse(current.data.requiredActions);
  return actions.success ? resolveTarget(actions.data, path) : null;
}

function isWorkspacePage(path: string) {
  if (path === "/") return true;
  return HUB_PATHS.some(
    (root) =>
      root !== REQUIRED_ACTIONS_PATH &&
      (path === root || path.startsWith(`${root}/`)),
  );
}
