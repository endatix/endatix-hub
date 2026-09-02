import { CreateTenantDialog } from "@/features/platform-admin/create-tenant/ui/create-tenant-dialog";
import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { TenantsListToolbar } from "@/features/platform-admin/list-tenants/ui/tenants-list-toolbar";
import { TenantsTableFromPromise } from "@/features/platform-admin/list-tenants/ui/tenants-table";
import { TenantsTableSkeleton } from "@/features/platform-admin/list-tenants/ui/tenants-table-skeleton";
import { parsePlatformTenantListParams } from "@/features/platform-admin/utils";
import type { PlatformTenantSearchParams } from "@/features/platform-admin/types";
import { getAllFlags } from "@/lib/feature-flags/flags";
import { Suspense } from "react";

interface TenantsPageProps {
  searchParams?: Promise<PlatformTenantSearchParams>;
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const [session, resolvedSearchParams, flags] = await Promise.all([
    requirePlatformAdmin(),
    searchParams,
    getAllFlags(),
  ]);
  const tenantsPromise = listPlatformTenants(
    session,
    parsePlatformTenantListParams(resolvedSearchParams),
  );

  return (
    <PlatformAdminShell
      title="Tenants"
      description="Review and manage tenants. Assume a tenant only for support access."
      actions={
        flags.tenantManagement ? <CreateTenantDialog /> : undefined
      }
    >
      <TenantsListToolbar />
      <Suspense fallback={<TenantsTableSkeleton />}>
        <TenantsTableFromPromise
          tenantsPromise={tenantsPromise}
          canManage={flags.tenantManagement}
        />
      </Suspense>
    </PlatformAdminShell>
  );
}
