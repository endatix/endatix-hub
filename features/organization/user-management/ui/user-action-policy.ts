export type UserActionAvailability =
  | {
      status: "enabled";
    }
  | {
      status: "disabled";
      tooltip: string;
    }
  | {
      status: "hidden";
    };

export type UserActionPolicy = {
  editRole: UserActionAvailability;
  resendInvitation: UserActionAvailability;
  removeFromOrganization: UserActionAvailability;
  cancelInvitation: UserActionAvailability;
};

export type UserActionPolicyInput = {
  isActive: boolean;
  isYou: boolean;
  isPlatformAdminUser: boolean;
  canManageRoles: boolean;
  canManageUsers: boolean;
  canManageInvitations: boolean;
};

export function getUserActionPolicy({
  isActive,
  isYou,
  isPlatformAdminUser,
  canManageRoles,
  canManageUsers,
  canManageInvitations,
}: UserActionPolicyInput): UserActionPolicy {
  return {
    editRole: getEditRoleAction({
      isActive,
      isPlatformAdminUser,
      canManageRoles,
    }),
    resendInvitation: getResendInvitationAction({
      isActive,
      canManageInvitations,
    }),
    removeFromOrganization: getRemoveFromOrganizationAction({
      isActive,
      isYou,
      isPlatformAdminUser,
      canManageUsers,
    }),
    cancelInvitation: getCancelInvitationAction({
      isActive,
      isYou,
      canManageInvitations,
    }),
  };
}

function getEditRoleAction({
  isActive,
  isPlatformAdminUser,
  canManageRoles,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "isPlatformAdminUser" | "canManageRoles"
>): UserActionAvailability {
  if (!isActive) {
    return hidden();
  }

  if (isPlatformAdminUser) {
    return disabled("Managed at platform level");
  }

  return canManageRoles
    ? enabled()
    : disabled("You don't have permission to manage roles");
}

function getResendInvitationAction({
  isActive,
  canManageInvitations,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "canManageInvitations"
>): UserActionAvailability {
  if (isActive) {
    return hidden();
  }

  return canManageInvitations
    ? enabled()
    : disabled("You don't have permission to resend invitations");
}

function getRemoveFromOrganizationAction({
  isActive,
  isYou,
  isPlatformAdminUser,
  canManageUsers,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "isYou" | "isPlatformAdminUser" | "canManageUsers"
>): UserActionAvailability {
  if (!isActive) {
    return hidden();
  }

  if (isPlatformAdminUser) {
    return disabled("Managed at platform level");
  }

  if (isYou) {
    return disabled("You cannot remove your own access");
  }

  return canManageUsers
    ? enabled()
    : disabled("You don't have permission to remove users");
}

function getCancelInvitationAction({
  isActive,
  isYou,
  canManageInvitations,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "isYou" | "canManageInvitations"
>): UserActionAvailability {
  if (isActive) {
    return hidden();
  }

  if (isYou) {
    return disabled("You cannot cancel your own invitation");
  }

  return canManageInvitations
    ? enabled()
    : disabled("You don't have permission to cancel invitations");
}

function enabled(): UserActionAvailability {
  return { status: "enabled" };
}

function disabled(tooltip: string): UserActionAvailability {
  return { status: "disabled", tooltip };
}

function hidden(): UserActionAvailability {
  return { status: "hidden" };
}
