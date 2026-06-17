import {
  getAuthSettings,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { AuthSettingsPanel } from "@/features/platform-admin/view-auth-settings/ui/auth-settings-panel";

export default async function AuthSettingsPage() {
  const session = await requirePlatformAdmin();
  const summary = await getAuthSettings(session);

  return (
    <PlatformAdminShell
      title="Auth Settings"
      description="Review authentication provider status and platform admin approval rules."
    >
      <AuthSettingsPanel summary={summary} />
    </PlatformAdminShell>
  );
}
