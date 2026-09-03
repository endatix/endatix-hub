import { CreateTenantDialog } from "@/features/platform-admin/create-tenant/ui/create-tenant-dialog";
import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { TenantsList } from "@/features/platform-admin/list-tenants/ui/tenants-list";
import {
  parsePlatformTenantListParams,
  tenantsListSuspenseKey,
} from "@/features/platform-admin/list-tenants/utils";
import type { PlatformTenantSearchParams } from "@/features/platform-admin/types";
import { tenantManagementFlag } from "@/lib/feature-flags/flags";

interface TenantsPageProps {
  searchParams?: Promise<PlatformTenantSearchParams>;
}

export default async function TenantsPage({
  searchParams,
}: Readonly<TenantsPageProps>) {
  const [session, resolvedSearchParams, canManage] = await Promise.all([
    requirePlatformAdmin(),
    searchParams,
    tenantManagementFlag(),
  ]);

  const listRequest = parsePlatformTenantListParams(resolvedSearchParams);
  const tenantsPromise = listPlatformTenants(session, listRequest);

  return (
    <PlatformAdminShell
      title="Tenants"
      description="Review and manage tenants. Assume a tenant only for support access."
      actions={canManage ? <CreateTenantDialog /> : undefined}
    >
      <TenantsList
        tenantsPromise={tenantsPromise}
        listKey={tenantsListSuspenseKey(listRequest)}
        canManage={canManage}
      />
    </PlatformAdminShell>
  );
}
