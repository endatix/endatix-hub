import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import {
  getPlatformDashboard,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformDashboard } from "@/features/platform-admin/view-platform-dashboard/ui/platform-dashboard";

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  const dashboard = await getPlatformDashboard(session);

  return (
    <PlatformAdminShell
      title="Platform Admin"
      description="Manage tenants, platform administrators, and safe platform configuration from one place."
    >
      <PlatformDashboard dashboard={dashboard} />
    </PlatformAdminShell>
  );
}
