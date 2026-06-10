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
  lockout: UserActionAvailability;
};

export type UserActionPolicyInput = {
  isActive: boolean;
  isYou: boolean;
  isPlatformAdminUser: boolean;
  isExternal: boolean;
  isLockedOut: boolean;
  canManageRoles: boolean;
  canManageUsers: boolean;
  canManageInvitations: boolean;
};

export function getUserActionPolicy({
  isActive,
  isYou,
  isPlatformAdminUser,
  isExternal,
  isLockedOut,
  canManageRoles,
  canManageUsers,
  canManageInvitations,
}: UserActionPolicyInput): UserActionPolicy {
  return {
    editRole: getEditRoleAction({
      isActive,
      isPlatformAdminUser,
      isExternal,
      canManageRoles,
    }),
    resendInvitation: getResendInvitationAction({
      isActive,
      isExternal,
      canManageInvitations,
    }),
    removeFromOrganization: getRemoveFromOrganizationAction({
      isActive,
      isYou,
      isPlatformAdminUser,
      isExternal,
      canManageUsers,
    }),
    cancelInvitation: getCancelInvitationAction({
      isActive,
      isYou,
      canManageInvitations,
    }),
    lockout: getLockoutAction({
      isYou,
      isPlatformAdminUser,
      isLockedOut,
      canManageUsers,
    }),
  };
}

function getEditRoleAction({
  isActive,
  isPlatformAdminUser,
  isExternal,
  canManageRoles,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "isPlatformAdminUser" | "isExternal" | "canManageRoles"
>): UserActionAvailability {
  if (!isActive) {
    return hidden();
  }

  if (isExternal) {
    return disabled("SSO users receive roles from their identity provider");
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
  isExternal,
  canManageInvitations,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "isExternal" | "canManageInvitations"
>): UserActionAvailability {
  if (isActive || isExternal) {
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
  isExternal,
  canManageUsers,
}: Pick<
  UserActionPolicyInput,
  "isActive" | "isYou" | "isPlatformAdminUser" | "isExternal" | "canManageUsers"
>): UserActionAvailability {
  if (!isActive) {
    return hidden();
  }

  if (isExternal) {
    return disabled("SSO users are managed by their identity provider");
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

function getLockoutAction({
  isYou,
  isPlatformAdminUser,
  isLockedOut,
  canManageUsers,
}: Pick<
  UserActionPolicyInput,
  "isYou" | "isPlatformAdminUser" | "isLockedOut" | "canManageUsers"
>): UserActionAvailability {
  if (isPlatformAdminUser) {
    return disabled("Managed at platform level");
  }

  if (isYou) {
    return disabled("You cannot lock out your own account");
  }

  return canManageUsers
    ? enabled()
    : disabled(
        isLockedOut
          ? "You don't have permission to unlock users"
          : "You don't have permission to lock out users",
      );
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
