import {
  getStorageSettings,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { StorageSettingsPanel } from "@/features/platform-admin/view-storage-settings/ui/storage-settings-panel";

export const metadata = {
  title: "Storage Settings | Admin",
  description: "View platform storage configuration status.",
};

export default async function StorageSettingsPage() {
  const session = await requirePlatformAdmin();
  const summary = await getStorageSettings(session);

  return (
    <PlatformAdminShell
      title="Storage Settings"
      description="Review allowlisted storage provider status without exposing connection strings or secrets."
    >
      <StorageSettingsPanel summary={summary} />
    </PlatformAdminShell>
  );
}
