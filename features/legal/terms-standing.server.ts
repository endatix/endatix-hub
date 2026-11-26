import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EndatixApi, isAuthError } from "@/lib/endatix-api";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import { mustReturnHome, resolveTarget } from "@/lib/routes/resolve-target";
import { workspaceDestination } from "@/lib/routes/terms-journey";
import { homeScope, workspaceScope } from "@/lib/routes/workspace-scope.server";
import { SystemRoles, availableResolvers } from "@/features/auth/server";
import { readAssumeSession } from "@/features/platform-admin/server";

export async function signedInToken() {
  const session = await auth();
  if (!session?.accessToken || session.error) redirect("/signin");
  return session.accessToken;
}

export async function termsStanding(token: string) {
  const current = await new EndatixApi(token).auth.getAuthorizationData();
  if (isAuthError(current)) redirect("/signin");
  if (!current.success) return null;
  const actions = requiredActionsSchema.safeParse(
    current.data.requiredActions ?? [],
  );
  if (!actions.success) return null;
  if (mustReturnHome(actions.data) || readAssumeSession(token))
    redirect("/required-actions");
  return {
    userId: current.data.userId,
    scope: workspaceScope(token),
    homeScope: homeScope(token),
    enforced: current.data.requiredActionsEnforced === true,
    platformAdmin: current.data.roles.includes(SystemRoles.PlatformAdmin),
    actions: await availableResolvers(actions.data),
  };
}

export type Standing = NonNullable<Awaited<ReturnType<typeof termsStanding>>>;
export interface Journey {
  scope?: string;
  returnUrl?: string;
}

export function pendingTerms({ actions }: Standing) {
  return actions.find(
    (a) =>
      a.key === "saas.legal.terms" &&
      a.canResolve &&
      a.resolvePath === "/accept-terms",
  );
}

export function resumeWorkspace(standing: Standing, journey: Journey): never {
  const destination = scopedDestination(standing, journey);
  const blocker =
    standing.enforced &&
    standing.actions.some(action => action.key === "saas.legal.terms" && action.severity === "blocking") &&
    resolveTarget(standing.actions, destination.split("?")[0]);
  redirect(blocker || destination);
}

export function scopedDestination(standing: Standing, journey: Journey) {
  if (journey.scope === standing.homeScope)
    return standing.platformAdmin ? "/admin/tenants" : "/forms";
  return workspaceDestination(
    standing.scope === journey.scope ? journey.returnUrl : undefined,
  );
}
