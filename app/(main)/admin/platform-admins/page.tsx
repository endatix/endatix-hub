import {
  listPlatformAdminUsers,
  listPlatformTenants,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import {
  authorization,
  AuthorizationResult,
} from "@/features/auth/authorization";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { PlatformAdminsList } from "@/features/platform-admin/list-platform-admins/ui/platform-admins-list";
import type {
  PlatformAdminSearchParams,
  PlatformAdminSession,
} from "@/features/platform-admin/types";
import { parsePlatformAdminListParams } from "@/features/platform-admin/utils";
import { listQueryKey } from "@/lib/list-page/list-query-key";

interface PlatformAdminsPageProps {
  searchParams?: Promise<PlatformAdminSearchParams>;
}

export default async function PlatformAdminsPage({
  searchParams,
}: Readonly<PlatformAdminsPageProps>) {
  const session = await requirePlatformAdmin();
  const { getAuthorizationData } = await authorization(session);
  const authorizationData = await getAuthorizationData();
  const request = parsePlatformAdminListParams(await searchParams);
  const usersPromise = listPlatformAdminUsers(session, request);
  const tenantsPromise = listPlatformTenants(session, {
    page: 1,
    pageSize: 100,
  });
  const approvedAdminTotalPromise = getApprovedAdminTotal(session);
  const authorized = AuthorizationResult.isSuccess(authorizationData)
    ? authorizationData.data
    : undefined;
  const currentUserId = authorized?.userId ?? session.user?.id;
  const currentTenantId = authorized?.tenantId;

  return (
    <PlatformAdminShell
      title="Platform Admins"
      description="Grant or revoke local PlatformAdmin approval. External IdP roles alone do not grant platform access."
    >
      <PlatformAdminsList
        listKey={listQueryKey(request)}
        usersPromise={usersPromise}
        tenantsPromise={tenantsPromise}
        approvedAdminTotalPromise={approvedAdminTotalPromise}
        currentUserId={currentUserId}
        currentTenantId={currentTenantId}
      />
    </PlatformAdminShell>
  );
}

async function getApprovedAdminTotal(
  session: PlatformAdminSession,
): Promise<number> {
  const approved = await listPlatformAdminUsers(session, {
    scope: "approved",
    page: 1,
    pageSize: 1,
  });

  return approved.totalRecords;
}
