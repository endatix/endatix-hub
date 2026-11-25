import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EndatixApi, isAuthError } from "@/lib/endatix-api";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import { SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { PendingActionStatus } from "@/features/auth/required-actions/pending-action-status";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { RetryStatus } from "@/features/auth/required-actions/retry-status";

export default async function RequiredActionsPage() {
  const session = await auth();
  if (!session?.accessToken || session.error) redirect(SIGNIN_PATH);
  // The refusal may be newer than the Hub's cached permissions.
  const current = await new EndatixApi(session.accessToken).auth.getAuthorizationData();
  if (isAuthError(current)) redirect(SIGNIN_PATH);
  const actions =
    current.success &&
    requiredActionsSchema.safeParse(current.data.requiredActions ?? []);
  return (
    <>
      <AuthLogo />
      {actions && actions.success ? (
        <PendingActionStatus actions={actions.data} />
      ) : (
        <RetryStatus />
      )}
    </>
  );
}
