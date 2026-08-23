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
      description="Review Hub runtime configuration resolved from process environment. Values cannot be changed here."
    >
      <EnvironmentSettingsPanel summary={summary} />
    </PlatformAdminShell>
  );
}
