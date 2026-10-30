import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { testLinkAccess } from "../test-link-access.server";

vi.mock("server-only", () => ({}));

const FORM_ID = "1525035735390879744";

const supportsTestLinks = vi.fn();
const checkPermission = vi.fn();
const api = { audience: { supportsTestLinks } } as never;

function grant(...granted: string[]) {
  checkPermission.mockImplementation(async (permission: string) => ({
    success: granted.includes(permission),
  }));
}

const EDITOR = [Permissions.Forms.Test, Permissions.Forms.Edit];

describe("testLinkAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supportsTestLinks.mockResolvedValue(true);
  });

  it("lets an editor who may test copy and download test links on an API with the route", async () => {
    grant(...EDITOR);

    const access = await testLinkAccess(api, FORM_ID, checkPermission);

    expect(access).toEqual({ canCopyTestLink: true, canMintTestLinks: true });
    expect(supportsTestLinks).toHaveBeenCalledWith(FORM_ID);
  });

  it("hides Download on an older API, and keeps Copy test link for a reader who may view submissions", async () => {
    supportsTestLinks.mockResolvedValue(false);
    grant(...EDITOR, Permissions.Submissions.View);

    const access = await testLinkAccess(api, FORM_ID, checkPermission);

    expect(access).toEqual({ canCopyTestLink: true, canMintTestLinks: false });
  });

  it("hides both on an older API for an editor without a submissions grant", async () => {
    supportsTestLinks.mockResolvedValue(false);
    grant(...EDITOR);

    const access = await testLinkAccess(api, FORM_ID, checkPermission);

    expect(access).toEqual({ canCopyTestLink: false, canMintTestLinks: false });
  });

  it.each([[Permissions.Forms.Test], [Permissions.Forms.Edit]])(
    "hides both, and asks the API nothing, with only %s",
    async (permission) => {
      grant(permission, Permissions.Submissions.View);

      const access = await testLinkAccess(api, FORM_ID, checkPermission);

      expect(access).toEqual({
        canCopyTestLink: false,
        canMintTestLinks: false,
      });
      expect(supportsTestLinks).not.toHaveBeenCalled();
    },
  );
});
