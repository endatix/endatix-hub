import { getAuthSettings } from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { AuthSettingsPanel } from "@/features/platform-admin/view-auth-settings/ui/auth-settings-panel";

export default async function AuthSettingsPage() {
  const summary = await getAuthSettings();

  return (
    <PlatformAdminShell
      title="Auth Settings"
      description="Review authentication provider status and platform admin approval rules."
    >
      <AuthSettingsPanel summary={summary} />
    </PlatformAdminShell>
  );
}
