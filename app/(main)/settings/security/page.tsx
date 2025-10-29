import { auth } from "@/auth";
import { createPermissionService } from "@/features/auth/permissions/application";
import { ChangePassword } from "@/features/my-account/ui/change-password/change-password";

export default async function SettingsAccountPage() {
  const session = await auth();
  const { requireHubAccess } = await createPermissionService(session);
  await requireHubAccess();

  return <ChangePassword />;
}
