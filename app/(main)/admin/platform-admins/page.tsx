import { Suspense } from "react";
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
import { PlatformAdminsTable } from "@/features/platform-admin/list-platform-admins/ui/platform-admins-table";
import type {
  PlatformAdminSearchParams,
  PlatformAdminSession,
} from "@/features/platform-admin/types";
import { parsePlatformAdminListParams } from "@/features/platform-admin/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <PlatformAdminShell
      title="Platform Admins"
      description="Grant or revoke local PlatformAdmin approval. External IdP roles alone do not grant platform access."
    >
      <Suspense fallback={<PlatformAdminsTableSkeleton />}>
        <PlatformAdminsTable
          usersPromise={usersPromise}
          tenantsPromise={tenantsPromise}
          approvedAdminTotalPromise={approvedAdminTotalPromise}
          currentUserId={
            AuthorizationResult.isSuccess(authorizationData)
              ? authorizationData.data.userId
              : session.user?.id
          }
          currentTenantId={
            AuthorizationResult.isSuccess(authorizationData)
              ? authorizationData.data.tenantId
              : undefined
          }
        />
      </Suspense>
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

function PlatformAdminsTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3, 4, 5].map((index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
