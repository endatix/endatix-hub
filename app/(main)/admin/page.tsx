import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import {
  getPlatformDashboard,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { listSignupRequests } from "@/features/platform-admin/list-signup-requests/list-signup-requests.server";
import { PlatformDashboard } from "@/features/platform-admin/view-platform-dashboard/ui/platform-dashboard";
import { getAllFlags } from "@/lib/feature-flags/flags";

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  const flags = await getAllFlags();
  const dashboard = await getPlatformDashboard(session);
  const signupRequests = flags.saasManagement
    ? await listSignupRequests(session, {
        status: "pending",
        page: 1,
        pageSize: 1,
      })
    : null;

  return (
    <PlatformAdminShell
      title="Platform Admin"
      description="Manage tenants, platform administrators, and safe platform configuration from one place."
    >
      <PlatformDashboard
        dashboard={dashboard}
        showSignupRequests={flags.saasManagement}
        pendingSignupRequests={signupRequests?.totalRecords ?? 0}
      />
    </PlatformAdminShell>
  );
}
