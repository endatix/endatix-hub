"use client";

import { Info } from "lucide-react";
import { PagedCardList, useListUrlState } from "@/components/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  PagedResponse,
  RoleListItem,
  UserListItem,
} from "@/lib/endatix-api";
import type { ResultType } from "@/lib/result";
import { UsersListToolbar } from "./users-list-toolbar";
import { UsersTable } from "./users-table";

interface UsersListProps {
  usersPromise: Promise<ResultType<PagedResponse<UserListItem>>>;
  listKey: string;
  availableRolesPromise: Promise<RoleListItem[]>;
  currentUserId?: string;
  canInviteUsers?: boolean;
  canResendVerification?: boolean;
  canManageRoles?: boolean;
  canManageUsers?: boolean;
}

/** List shell: owns the URL state once for the toolbar and the grid. */
export function UsersList({
  usersPromise,
  listKey,
  availableRolesPromise,
  currentUserId,
  canInviteUsers = false,
  canResendVerification = false,
  canManageRoles = false,
  canManageUsers = false,
}: Readonly<UsersListProps>) {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Secure invitation flow</AlertTitle>
        <AlertDescription>
          Invited users receive a one-time activation link and choose their own
          password. Pending invites can be resent or cancelled.
        </AlertDescription>
      </Alert>

      <PagedCardList
        listKey={listKey}
        isPending={isPending}
        headerClassName="border-b bg-card py-4 max-lg:sticky max-lg:top-[56px] max-lg:z-20 max-lg:shadow-sm"
        toolbar={
          <UsersListToolbar
            search={search}
            setSearch={setSearch}
            updateUrl={updateUrl}
            searchParams={searchParams}
            availableRolesPromise={availableRolesPromise}
            canInviteUsers={canInviteUsers}
          />
        }
      >
        <UsersTable
          usersPromise={usersPromise}
          updateUrl={updateUrl}
          currentUserId={currentUserId}
          canResendVerification={canResendVerification}
          canManageRoles={canManageRoles}
          canManageUsers={canManageUsers}
          availableRolesPromise={availableRolesPromise}
        />
      </PagedCardList>
    </div>
  );
}
