import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { getPlatformDashboard, requirePlatformAdmin } from "@/features/platform-admin/server";
import { PlatformDashboard } from "@/features/platform-admin/view-platform-dashboard/ui/platform-dashboard";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import Link from "next/link";

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  const [dashboard, legalEnabled] = await Promise.all([getPlatformDashboard(session), termsAcceptanceEnabled()]);

  return (
    <PlatformAdminShell
      title="Platform Admin"
      actions={legalEnabled && <Link className="text-primary underline" href="/admin/legal">Manage legal documents</Link>}
      description="Manage tenants, platform administrators, and safe platform configuration from one place."
    >
      <PlatformDashboard dashboard={dashboard} />
    </PlatformAdminShell>
  );
}
