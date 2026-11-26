import type { Session } from "next-auth";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Route } from "next";
import { WORKSPACE_NAVIGATION } from "@/lib/routes/workspace-navigation";
import { TERMS_PATH, termsVisit } from "@/lib/routes/terms-journey";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { currentAuthorization } from "../authorization/application/current-authorization.server";
import { RESOLVER_VISIT } from "@/lib/routes/optional-resolver";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import {
  REQUIRED_ACTIONS_PATH,
  resolveTarget,
} from "@/lib/routes/resolve-target";
import {
  availableResolvers,
  resolverAvailable,
} from "./available-resolvers.server";

/** Read the serving host on navigation; the Hub's role cache can outlive a change of standing. */
async function workspaceRedirect(
  session: Session | null,
  { pathname: path, searchParams }: Pick<URL, "pathname" | "searchParams">,
) {
  if (!session?.accessToken || session.error)
    return null;
  if (
    searchParams.get(RESOLVER_VISIT) === "1" &&
    !(await resolverAvailable(path))
  )
    return REQUIRED_ACTIONS_PATH;
  const current = await currentAuthorization(session.accessToken);
  if (!current.success || current.data.requiredActionsEnforced !== true)
    return null;
  const actions = requiredActionsSchema.safeParse(current.data.requiredActions);
  return actions.success
    ? resolveTarget(await availableResolvers(actions.data), path)
    : null;
}

export const workspaceActionTarget = cache(async () => {
  const source = (await headers()).get(WORKSPACE_NAVIGATION);
  if (!source) return null;
  const url = new URL(source, "https://workspace.invalid");
  if (url.pathname === "/admin/legal") return null;
  const session = await auth();
  const target = await workspaceRedirect(session, url);
  return target === TERMS_PATH ? termsVisit(source, workspaceScope(session?.accessToken)) : target;
});

/** Call after the page's ordinary admission checks, before loading its content. */
export async function resolveWorkspaceAction() {
  const target = await workspaceActionTarget();
  if (target) redirect(target);
}

export async function redirectDisabledPage<T extends string>(fallback: Route<T>): Promise<never> {
  const source = (await headers()).get(WORKSPACE_NAVIGATION);
  const visit = source && new URL(source, "https://workspace.invalid").searchParams.get(RESOLVER_VISIT);
  if (visit === "1") redirect(REQUIRED_ACTIONS_PATH);
  redirect(fallback);
}

/** A throwing page guard must finish before deciding whether to show a resolver. */
export async function admitWorkspacePage<T>(guard: Promise<T>) {
  const admitted = await guard;
  await resolveWorkspaceAction();
  return admitted;
}

/** Parallel slots must not load product data or override the page's own denial. */
export function workspaceSlot<P extends unknown[], T>(render: (...props: P) => T) {
  return async (...props: P) => {
    if (await workspaceActionTarget()) return null;
    return render(...props);
  };
}
