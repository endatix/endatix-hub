import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { UserListItem } from "@/lib/endatix-api";
import { UsersTable } from "@/features/organization/view-users/ui/users-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Session } from "next-auth";

async function getUsersPromise(
  session: Session | null = null,
): Promise<UserListItem[]> {
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ViewUsers);

  const api = new EndatixApi(session?.accessToken);
  const result = await api.users.list();

  if (!result.success) {
    throw new Error(result.error.message ?? "Failed to load users");
  }

  return result.data;
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default async function SettingsOrganizationUsersPage() {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const usersPromise = getUsersPromise(session);
  const currentUserId = session?.user?.id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          People in your organization.
        </p>
      </div>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable usersPromise={usersPromise} currentUserId={currentUserId} />
      </Suspense>
    </div>
  );
}
