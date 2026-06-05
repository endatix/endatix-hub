import { describe, expect, it } from "vitest";
import {
  getUserActionPolicy,
  type UserActionPolicyInput,
} from "../user-action-policy";

const baseInput: UserActionPolicyInput = {
  isActive: true,
  isYou: false,
  isPlatformAdminUser: false,
  canManageRoles: true,
  canManageUsers: true,
  canManageInvitations: true,
};

describe("getUserActionPolicy", () => {
  it("hides invitation actions for active users", () => {
    const policy = getUserActionPolicy(baseInput);

    expect(policy.editRole.status).toBe("enabled");
    expect(policy.removeFromOrganization.status).toBe("enabled");
    expect(policy.resendInvitation.status).toBe("hidden");
    expect(policy.cancelInvitation.status).toBe("hidden");
  });

  it("hides active-user actions for pending invite users", () => {
    const policy = getUserActionPolicy({
      ...baseInput,
      isActive: false,
    });

    expect(policy.editRole.status).toBe("hidden");
    expect(policy.removeFromOrganization.status).toBe("hidden");
    expect(policy.resendInvitation.status).toBe("enabled");
    expect(policy.cancelInvitation.status).toBe("enabled");
  });

  it("keeps pending invite actions visible but disabled without invite permission", () => {
    const policy = getUserActionPolicy({
      ...baseInput,
      isActive: false,
      canManageInvitations: false,
    });

    expect(policy.resendInvitation).toEqual({
      status: "disabled",
      tooltip: "You don't have permission to resend invitations",
    });
    expect(policy.cancelInvitation).toEqual({
      status: "disabled",
      tooltip: "You don't have permission to cancel invitations",
    });
  });

  it("disables protected platform-admin actions when they apply", () => {
    const policy = getUserActionPolicy({
      ...baseInput,
      isPlatformAdminUser: true,
    });

    expect(policy.editRole).toEqual({
      status: "disabled",
      tooltip: "Managed at platform level",
    });
    expect(policy.removeFromOrganization).toEqual({
      status: "disabled",
      tooltip: "Managed at platform level",
    });
  });

  it("disables self-removal instead of hiding the action", () => {
    const policy = getUserActionPolicy({
      ...baseInput,
      isYou: true,
    });

    expect(policy.removeFromOrganization).toEqual({
      status: "disabled",
      tooltip: "You cannot remove your own access",
    });
  });
});
