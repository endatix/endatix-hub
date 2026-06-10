"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserListItem } from "@/lib/endatix-api";
import { getDisplayName, getInitials } from "@/features/users/user-utils";

export const USERS_COLUMNS_DEFINITION = (
  currentUserId?: string,
): ColumnDef<UserListItem>[] => [
  {
    id: "name",
    header: "NAME",
    cell: ({ row }) => {
      const user = row.original;
      const displayName =
        user.displayName?.trim() ||
        getDisplayName(user.userName, user.email ?? undefined);
      const initials = getInitials(user.userName, user.email ?? undefined);
      const isYou = currentUserId != null && user.id === currentUserId;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 rounded-full">
            <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate">
            {displayName}
            {isYou && <span className="ml-1 text-muted-foreground">(you)</span>}
          </span>
        </div>
      );
    },
  },
  {
    id: "email",
    header: "EMAIL",
    cell: ({ row }) => (
      <span
        className="block min-w-0 truncate"
        title={row.original.email ?? undefined}
      >
        {row.original.email ?? "—"}
      </span>
    ),
  },
  {
    id: "level",
    header: "ROLES",
    cell: ({ row }) => {
      const roles = row.original.roles;

      if (roles.length === 0) {
        return (
          <span
            className="items-center justify-center text-muted-foreground"
            title="No roles"
          >
            —
          </span>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          {roles.map((role) => (
            <Badge key={role} variant="secondary" className="font-normal">
              {role}
            </Badge>
          ))}
        </div>
      );
    },
  },
];
