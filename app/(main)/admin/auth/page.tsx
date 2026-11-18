import {
  getAuthSettings,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { getBrand } from "@/lib/branding/server";
import { AuthSettingsPanel } from "@/features/platform-admin/view-auth-settings/ui/auth-settings-panel";

export default async function AuthSettingsPage() {
  const session = await requirePlatformAdmin();
  const [summary, brand] = await Promise.all([
    getAuthSettings(session),
    getBrand(),
  ]);

  return (
    <PlatformAdminShell
      title="Auth Settings"
      description="Review authentication provider status and platform admin approval rules."
    >
      <AuthSettingsPanel summary={summary} productName={brand.shortName} />
    </PlatformAdminShell>
  );
}
