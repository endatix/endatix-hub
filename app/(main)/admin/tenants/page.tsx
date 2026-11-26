import { withWorkspaceSetupAfter } from "@/features/onboarding/server";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import { CreateTenantPanel } from "@/features/platform-admin/create-tenant/ui/create-tenant-panel";
import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { TenantsList } from "@/features/platform-admin/list-tenants/ui/tenants-list";
import { parsePlatformTenantListParams } from "@/features/platform-admin/list-tenants/utils";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import type { PlatformTenantSearchParams } from "@/features/platform-admin/types";
import { tenantManagementFlag } from "@/lib/feature-flags/flags";

interface TenantsPageProps {
  searchParams?: Promise<PlatformTenantSearchParams>;
}

export default async function TenantsPage({
  searchParams,
}: Readonly<TenantsPageProps>) {
  const [session, resolvedSearchParams, canManage] = await Promise.all([
    admitWorkspacePage(requirePlatformAdmin()),
    searchParams,
    tenantManagementFlag(),
  ]);

  const listRequest = parsePlatformTenantListParams(resolvedSearchParams);
  const tenantsPromise = listPlatformTenants(session, listRequest);

  return withWorkspaceSetupAfter(tenantsPromise.then(() => true),
    <PlatformAdminShell
      title="Tenants"
      description="Review and manage tenants. Assume a tenant only for support access."
      actions={canManage ? <CreateTenantPanel /> : undefined}
    >
      <TenantsList
        tenantsPromise={tenantsPromise}
        listKey={listQueryKey(listRequest)}
        canManage={canManage}
      />
    </PlatformAdminShell>
  );
}
