import { withWorkspaceSetupEntry } from "@/features/onboarding/server";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ChangePassword } from "@/features/my-account/ui/change-password/change-password";

export default async function SettingsAccountPage() {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await admitWorkspacePage(requireHubAccess());

  return withWorkspaceSetupEntry(<ChangePassword />);
}
