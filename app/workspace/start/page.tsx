import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import { canResumeWorkspaceSetup } from "@/features/onboarding/server";
import { onboardingFlag } from "@/lib/feature-flags/flags";
import { workspaceSetupHref } from "@/lib/routes/workspace-path";

/** Only a sign-in without a requested destination enters here. */
export default async function WorkspaceStartPage() {
  const { requireHubAccess } = await authorization(await auth());
  await admitWorkspacePage(requireHubAccess());
  if (await onboardingFlag() && await canResumeWorkspaceSetup()) redirect(workspaceSetupHref);
  redirect("/forms");
}
