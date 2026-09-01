import {
  getEnvironmentSettings,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { EnvironmentSettingsPanel } from "@/features/platform-admin/view-environment-settings/ui/environment-settings-panel";

export const metadata = {
  title: "Environment | Admin",
  description: "View Hub runtime environment configuration.",
};

export default async function EnvironmentSettingsPage() {
  const session = await requirePlatformAdmin();
  const summary = await getEnvironmentSettings(session);

  return (
    <PlatformAdminShell
      title="Environment"
      description="Review Hub runtime configuration resolved from process environment. Public values are shown in full; Sensitive values shown as Set / Not set only."
    >
      <EnvironmentSettingsPanel summary={summary} />
    </PlatformAdminShell>
  );
}
