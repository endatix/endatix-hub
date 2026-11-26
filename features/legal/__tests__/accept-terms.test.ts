import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptTerms } from "../accept-terms.action";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { invalidateUserAuthorizationCache } from "@/features/auth/server";

const { token, me, post, enabled } = vi.hoisted(() => ({
  token: "ordinary-session",
  me: vi.fn(),
  post: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: token }) }));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class {
    auth = { getAuthorizationData: me };
    post = post;
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("navigate:" + url);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "test-browser" }),
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  termsAcceptanceEnabled: enabled,
  formAnalyticsFlag: vi.fn(),
  reportingExportFlag: vi.fn(),
  personalizationFlag: vi.fn(),
}));
vi.mock(
  "@/features/auth/authorization/application/authorization-data.provider",
  () => ({ invalidateUserAuthorizationCache: vi.fn() }),
);

const action = {
  key: "saas.legal.terms",
  scope: "user",
  severity: "blocking",
  canResolve: true,
  blockNonResolvers: true,
  resolvePath: "/accept-terms",
  resolverRoles: [],
};
const snapshot = (...requiredActions: object[]) => ({
  success: true,
  data: {
    roles: [],
    userId: "123",
    tenantId: "456",
    requiredActions,
    requiredActionsEnforced: true,
  },
});
const display = {
  versionId: "9007199254740993",
  scope: workspaceScope(token),
  returnUrl: "/forms/folders?tab=mine",
};
const checked = new FormData();
checked.set("accept", "on");

describe("accepting the displayed publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enabled.mockResolvedValue(true);
    me.mockResolvedValue(snapshot(action));
    post.mockResolvedValue({ success: true, data: null });
  });
  it("sends the exact string, clears cached permissions and resumes after the fresh read", async () => {
    me.mockResolvedValueOnce(snapshot(action)).mockResolvedValueOnce(
      snapshot(),
    );
    await expect(acceptTerms(display, checked)).rejects.toThrow(
      "navigate:/forms/folders?tab=mine",
    );
    expect(post).toHaveBeenCalledWith(
      "/legal/acceptances",
      { versionId: "9007199254740993" },
      { headers: { "User-Agent": "test-browser" } },
    );
    expect(invalidateUserAuthorizationCache).toHaveBeenCalledWith({
      userId: "123",
    });
  });
  it("does not post unchecked consent", async () => {
    expect(await acceptTerms(display, new FormData())).toMatch(/checkbox/);
    expect(post).not.toHaveBeenCalled();
  });
  it("drops a continuation from a different session before recording anything", async () => {
    await expect(
      acceptTerms({ ...display, scope: "old-session" }, checked),
    ).rejects.toThrow("navigate:/accept-terms");
    expect(post).not.toHaveBeenCalled();
  });
  it("sends a non-resolvable support session to the return-home action", async () => {
    me.mockResolvedValue(
      snapshot({
        ...action,
        key: "saas.legal.return-home",
        resolvePath: "/required-actions",
        canResolve: false,
      }),
    );
    await expect(acceptTerms(display, checked)).rejects.toThrow(
      "navigate:/required-actions",
    );
    expect(post).not.toHaveBeenCalled();
  });
  it("asks for review again when a replacement publication wins the race", async () => {
    post.mockResolvedValue({
      success: false,
      error: { details: { statusCode: 409 } },
    });
    await expect(acceptTerms(display, checked)).rejects.toThrow(
      /navigate:\/accept-terms\?.*updated=1/,
    );
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("offers recovery rather than admission when the post-acceptance read fails", async () => {
    me.mockResolvedValueOnce(snapshot(action)).mockResolvedValueOnce({
      success: false,
      error: { type: "NetworkError" },
    });
    expect(await acceptTerms(display, checked)).toMatch(/refresh/);
  });
  it("does not fetch or submit when the resolver is disabled", async () => {
    enabled.mockResolvedValue(false);
    await expect(acceptTerms(display, checked)).rejects.toThrow(
      "navigate:/required-actions",
    );
    expect(post).not.toHaveBeenCalled();
    expect(me).not.toHaveBeenCalled();
  });
});
