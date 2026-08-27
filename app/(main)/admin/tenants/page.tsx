import { CreateTenantDialog } from "@/features/platform-admin/create-tenant/ui/create-tenant-dialog";
import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { toAuthProviderOptions } from "@/features/platform-admin/view-auth-settings/auth-provider-options";
import { getAuthSettings } from "@/features/platform-admin/view-auth-settings/view-auth-settings.server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { TenantsListToolbar } from "@/features/platform-admin/list-tenants/ui/tenants-list-toolbar";
import { TenantsTableFromPromise } from "@/features/platform-admin/list-tenants/ui/tenants-table";
import { TenantsTableSkeleton } from "@/features/platform-admin/list-tenants/ui/tenants-table-skeleton";
import { parsePlatformTenantListParams } from "@/features/platform-admin/utils";
import type { PlatformTenantSearchParams } from "@/features/platform-admin/types";
import { tenantManagementFlag } from "@/lib/feature-flags/flags";
import { Suspense } from "react";

interface TenantsPageProps {
  searchParams?: Promise<PlatformTenantSearchParams>;
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const [session, resolvedSearchParams, canManage] = await Promise.all([
    requirePlatformAdmin(),
    searchParams,
    tenantManagementFlag(),
  ]);

  const tenantsPromise = listPlatformTenants(
    session,
    parsePlatformTenantListParams(resolvedSearchParams),
  );
  const authProviders = canManage
    ? await getAuthSettings(session).then(toAuthProviderOptions)
    : [];

  return (
    <PlatformAdminShell
      title="Tenants"
      description="Review and manage tenants. Assume a tenant only for support access."
      actions={
        canManage ? (
          <CreateTenantDialog authProviders={authProviders} />
        ) : undefined
      }
    >
      <TenantsListToolbar />
      <Suspense fallback={<TenantsTableSkeleton />}>
        <TenantsTableFromPromise
          tenantsPromise={tenantsPromise}
          canManage={canManage}
          authProviders={authProviders}
        />
      </Suspense>
    </PlatformAdminShell>
  );
}
