import { CreateTenantDialog } from "@/features/platform-admin/create-tenant/ui/create-tenant-dialog";
import type { AuthProviderOption } from "@/features/platform-admin/create-tenant/tenant-self-registration";
import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { getAuthSettings } from "@/features/platform-admin/view-auth-settings/view-auth-settings.server";
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
  const authProviders = flags.tenantManagement
    ? await loadAuthProviderOptions(session)
    : [];

  return (
    <PlatformAdminShell
      title="Tenants"
      description="Review and manage tenants. Assume a tenant only for support access."
      actions={
        flags.tenantManagement ? (
          <CreateTenantDialog authProviders={authProviders} />
        ) : undefined
      }
    >
      <TenantsListToolbar />
      <Suspense fallback={<TenantsTableSkeleton />}>
        <TenantsTableFromPromise
          tenantsPromise={tenantsPromise}
          canManage={flags.tenantManagement}
          authProviders={authProviders}
        />
      </Suspense>
    </PlatformAdminShell>
  );
}

async function loadAuthProviderOptions(
  session: Awaited<ReturnType<typeof requirePlatformAdmin>>,
): Promise<AuthProviderOption[]> {
  const summary = await getAuthSettings(session);
  const providers = new Map<string, AuthProviderOption>();

  for (const provider of summary.hub.providers) {
    if (provider.isActive) {
      providers.set(provider.id, { id: provider.id, name: provider.name });
    }
  }

  for (const provider of summary.api?.providers ?? []) {
    if (provider.isActive && !providers.has(provider.providerId)) {
      providers.set(provider.providerId, {
        id: provider.providerId,
        name: provider.displayName,
      });
    }
  }

  return [...providers.values()];
}
