import {
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { TenantsTable } from "@/features/platform-admin/list-tenants/ui/tenants-table";
import { parsePlatformTenantListParams } from "@/features/platform-admin/utils";
import type { PlatformTenantSearchParams } from "@/features/platform-admin/types";

interface TenantsPageProps {
  searchParams?: Promise<PlatformTenantSearchParams>;
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const session = await requirePlatformAdmin();
  const tenants = await listPlatformTenants(
    session,
    parsePlatformTenantListParams(await searchParams),
  );

  return (
    <PlatformAdminShell
      title="Tenants"
      description="Review tenant records and platform-level usage counts without switching tenant context."
    >
      <TenantsTable tenants={tenants} />
    </PlatformAdminShell>
  );
}
