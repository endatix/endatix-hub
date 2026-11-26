import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getAuthDataForCurrentUser } from "@/features/auth/authorization/application/authorization-data.provider";
import { WorkspaceGate } from "@/features/auth/required-actions/workspace-gate";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";

export default async function Template({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  const result = await getAuthDataForCurrentUser(session)();
  if (!result.success || result.data.requiredActionsEnforced !== true)
    return children;
  const actions = requiredActionsSchema.safeParse(result.data.requiredActions);
  if (!actions.success || !actions.data.some((a) => a.severity === "blocking"))
    return children;
  return <WorkspaceGate actions={actions.data}>{children}</WorkspaceGate>;
}
