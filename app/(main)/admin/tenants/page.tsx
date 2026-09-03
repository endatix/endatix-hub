import { CreateTenantDialog } from "@/features/platform-admin/create-tenant/ui/create-tenant-dialog";
import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { toAuthProviderOptions } from "@/features/platform-admin/view-auth-settings/auth-provider-options";
import { getAuthSettings } from "@/features/platform-admin/view-auth-settings/view-auth-settings.server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { TenantsTable } from "@/features/platform-admin/list-tenants/ui/tenants-table";
import { parsePlatformTenantListParams } from "@/features/platform-admin/utils";
import type { PlatformTenantSearchParams } from "@/features/platform-admin/types";
import { tenantManagementFlag } from "@/lib/feature-flags/flags";

interface TenantsPageProps {
  searchParams?: Promise<PlatformTenantSearchParams>;
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const [session, resolvedSearchParams, canManage] = await Promise.all([
    requirePlatformAdmin(),
    searchParams,
    tenantManagementFlag(),
  ]);

  const [tenants, authProviders] = await Promise.all([
    listPlatformTenants(
      session,
      parsePlatformTenantListParams(resolvedSearchParams),
    ),
    canManage ? getAuthSettings(session).then(toAuthProviderOptions) : [],
  ]);

  return (
    <PlatformAdminShell
      title="Tenants"
      description="Review tenant records and platform-level usage counts without switching tenant context."
      actions={
        canManage ? (
          <CreateTenantDialog authProviders={authProviders} />
        ) : undefined
      }
    >
      <TenantsTable
        tenants={tenants}
        canManage={canManage}
        authProviders={authProviders}
      />
    </PlatformAdminShell>
  );
}
