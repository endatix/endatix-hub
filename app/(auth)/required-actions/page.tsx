import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EndatixApi, isAuthError } from "@/lib/endatix-api";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import { SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { PendingActionStatus } from "@/features/auth/required-actions/pending-action-status";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { RetryStatus } from "@/features/auth/required-actions/retry-status";
import { SupportActionStatus } from "@/features/auth/required-actions/support-action-status";
import { exitAssumeAction } from "@/features/platform-admin/assume-tenant/assume-tenant.action";
import { mustReturnHome, resolveTarget } from "@/lib/routes/resolve-target";
import { availableResolvers } from "@/features/auth/required-actions/available-resolvers.server";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { TERMS_PATH, termsVisit } from "@/lib/routes/terms-journey";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";

export const metadata = { title: "Account actions" };

export default async function RequiredActionsPage({
  searchParams,
}: { searchParams?: Promise<{ home?: string }> } = {}) {
  const session = await auth();
  if (!session?.accessToken || session.error) redirect(SIGNIN_PATH);
  return (
    <>
      <AuthLogo />
      {await accountStatus(session.accessToken, (await searchParams)?.home)}
    </>
  );
}

async function accountStatus(token: string, home?: string) {
  // The refusal may be newer than the Hub's cached permissions.
  const current = await new EndatixApi(token).auth.getAuthorizationData();
  if (isAuthError(current)) redirect(SIGNIN_PATH);
  if (!current.success) return <RetryStatus />;
  const actions = requiredActionsSchema.safeParse(
    current.data.requiredActions ?? [],
  );
  if (!actions.success) return <RetryStatus />;
  if (mustReturnHome(actions.data))
    return <SupportActionStatus exitAction={exitAssumeAction} />;
  const resolvers = await availableResolvers(actions.data);
  if (home === "1") resumeHome(current.data.roles, resolvers, token);
  return <PendingActionStatus actions={resolvers} />;
}

function resumeHome(
  roles: string[],
  actions: Awaited<ReturnType<typeof availableResolvers>>,
  token: string,
) {
  const destination = roles.includes(SystemRoles.PlatformAdmin)
    ? "/admin/tenants"
    : "/forms";
  const target = resolveTarget(actions, destination);
  if (target === TERMS_PATH)
    redirect(termsVisit(destination, workspaceScope(token)));
  if (!target) redirect(destination);
}
