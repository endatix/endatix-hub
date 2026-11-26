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
import { mustReturnHome } from "@/lib/routes/resolve-target";

export const metadata = { title: "Account actions" };

export default async function RequiredActionsPage() {
  const session = await auth();
  if (!session?.accessToken || session.error) redirect(SIGNIN_PATH);
  return (
    <>
      <AuthLogo />
      {await accountStatus(session.accessToken)}
    </>
  );
}

async function accountStatus(token: string) {
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
  return <PendingActionStatus actions={actions.data} />;
}
