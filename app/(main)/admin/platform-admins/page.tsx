import {
  listPlatformAdminCandidates,
  listPlatformAdmins,
  requirePlatformAdmin,
} from "@/features/platform-admin/server";
import {
  authorization,
  AuthorizationResult,
} from "@/features/auth/authorization";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { PlatformAdminsTable } from "@/features/platform-admin/list-platform-admins/ui/platform-admins-table";
import type { PlatformAdminSearchParams } from "@/features/platform-admin/types";
import { parsePlatformAdminListParams } from "@/features/platform-admin/utils";

interface PlatformAdminsPageProps {
  searchParams?: Promise<PlatformAdminSearchParams>;
}

export default async function PlatformAdminsPage({
  searchParams,
}: PlatformAdminsPageProps) {
  const session = await requirePlatformAdmin();
  const { getAuthorizationData } = await authorization(session);
  const authorizationData = await getAuthorizationData();
  const request = parsePlatformAdminListParams(await searchParams);
  const [admins, candidates] = await Promise.all([
    listPlatformAdmins(request, session),
    listPlatformAdminCandidates({ ...request, pageSize: 10 }, session),
  ]);

  return (
    <PlatformAdminShell
      title="Platform Admins"
      description="Grant or revoke local PlatformAdmin approval. External IdP roles alone do not grant platform access."
    >
      <PlatformAdminsTable
        admins={admins}
        candidates={candidates}
        currentUserId={
          AuthorizationResult.isSuccess(authorizationData)
            ? authorizationData.data.userId
            : session?.user?.id
        }
      />
    </PlatformAdminShell>
  );
}
