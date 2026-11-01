import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorization,
  AuthorizationResult,
  Permissions,
} from "@/features/auth/authorization";
import { personalizationFlag } from "@/lib/feature-flags";
import {
  canAccessAudience,
  PARTICIPANT_PAGE_PERMISSION,
} from "../require-audience-api.server";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({ personalizationFlag: vi.fn() }));
vi.mock("@/features/auth/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/authorization")>()),
  authorization: vi.fn(),
}));

const checkAllPermissions = vi.fn();

function viewer({ grants, flag }: { grants: string[]; flag: boolean }) {
  vi.mocked(personalizationFlag).mockResolvedValue(flag);
  checkAllPermissions.mockImplementation(async (required: string[]) =>
    required.every((permission) => grants.includes(permission))
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden(),
  );
}

describe("canAccessAudience", () => {
  beforeEach(() => {
    vi.mocked(authorization).mockResolvedValue({
      checkAllPermissions,
    } as unknown as Awaited<ReturnType<typeof authorization>>);
  });

  it("lets an editor with Hub access through while personalization is on", async () => {
    viewer({
      grants: [Permissions.Access.Hub, Permissions.Forms.Edit],
      flag: true,
    });
    expect(await canAccessAudience(PARTICIPANT_PAGE_PERMISSION)).toBe(true);
  });

  it("refuses a viewer without the page's permission", async () => {
    viewer({ grants: [Permissions.Access.Hub], flag: true });
    expect(await canAccessAudience(PARTICIPANT_PAGE_PERMISSION)).toBe(false);
  });

  it("refuses an editor without Hub access, as requireAudienceAccess does", async () => {
    viewer({ grants: [Permissions.Forms.Edit], flag: true });
    expect(await canAccessAudience(PARTICIPANT_PAGE_PERMISSION)).toBe(false);
  });

  it("refuses everyone while personalization is off", async () => {
    viewer({
      grants: [Permissions.Access.Hub, Permissions.Forms.Edit],
      flag: false,
    });
    expect(await canAccessAudience(PARTICIPANT_PAGE_PERMISSION)).toBe(false);
  });
});
