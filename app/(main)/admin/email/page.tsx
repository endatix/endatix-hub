import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import {
  getEmailSettings,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { EmailSettingsPanel } from "@/features/platform-admin/view-email-settings/ui/email-settings-panel";

export default async function EmailSettingsPage() {
  const session = await admitWorkspacePage(requirePlatformAdmin());
  const settings = await getEmailSettings(session);

  return (
    <PlatformAdminShell
      title="Email Settings"
      description="Review platform email provider status and template availability."
    >
      <EmailSettingsPanel settings={settings} />
    </PlatformAdminShell>
  );
}
