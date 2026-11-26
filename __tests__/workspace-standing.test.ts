import { NextRequest } from "next/server";
import { resolverVisit } from "@/lib/routes/optional-resolver";
import { beforeEach, expect, it, vi } from "vitest";
import proxy from "@/proxy";

const { me } = vi.hoisted(() => ({ me: vi.fn() }));
const { exportEnabled } = vi.hoisted(() => ({ exportEnabled: vi.fn() }));
vi.mock("@/lib/feature-flags/flags", () => ({
  formAnalyticsFlag: async () => false,
  personalizationFlag: async () => false,
  reportingExportFlag: exportEnabled,
}));
vi.mock("@/auth", () => ({
  auth: async () => ({ accessToken: "session-token" }),
}));
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    auth = { getAuthorizationData: me };
  },
}));
const origin = "https://workspace.example";
const action = {
  key: "profile.complete",
  scope: "user",
  severity: "blocking",
  resolverRoles: [],
  canResolve: true,
  resolvePath: "/settings/security",
  blockNonResolvers: false,
};

function snapshot(mode: unknown, actions: object[] = [action]) {
  return {
    success: true,
    data: { requiredActionsEnforced: mode, requiredActions: actions },
  };
}
async function destination(path: string, method = "GET") {
  const outcome = await proxy(new NextRequest(origin + path, { method }));
  return outcome.headers.get("location");
}
beforeEach(() => me.mockResolvedValue(snapshot(true)));

it.each([undefined, false, "true"])(
  "does not proactively route a blocker for mode %s",
  async (mode) => {
    me.mockResolvedValue(snapshot(mode));
    expect(await destination("/forms")).toBeNull();
  },
);

it.each([
  "/",
  "/forms",
  "/settings",
  "/admin/tenants",
  "/folders/42",
  "/data-lists/1",
])("routes an enforced blocker from %s", async (path) => {
  expect(await destination(path)).toBe(origin + "/settings/security");
});

it("reads the serving host again across deeper workspace navigations and after clearance", async () => {
  me.mockResolvedValueOnce(snapshot(false))
    .mockResolvedValueOnce(snapshot(true))
    .mockResolvedValueOnce(snapshot(true, []));
  expect(await destination("/forms")).toBeNull();
  expect(await destination("/forms/42/design?tab=preview")).toBe(
    origin + "/settings/security",
  );
  expect(await destination("/forms/42/design")).toBeNull();
});

it("admits only an actual resolver on the provider page", async () => {
  expect(await destination("/settings/security")).toBeNull();
  me.mockResolvedValue(snapshot(true, [{ ...action, canResolve: false }]));
  expect(await destination("/settings/security")).toBe(
    origin + "/required-actions",
  );
});

it.each([
  "/signin",
  "/required-actions",
  "/share/42",
  "/accept-terms",
  "/forms-extra",
])("does not read standing for %s", async (path) => {
  expect(await destination(path)).toBeNull();
  expect(me).not.toHaveBeenCalled();
});

it.each([
  snapshot(true, []),
  snapshot(true, [{ ...action, severity: "notice" }]),
  { success: false },
])(
  "does not route notice, empty, or unsuccessful current-user data",
  async (result) => {
    me.mockResolvedValue(result);
    expect(await destination("/forms")).toBeNull();
  },
);

it("does not replay a mutation at a resolver URL", async () => {
  expect(await destination("/forms", "POST")).toBeNull();
  expect(me).not.toHaveBeenCalled();
});

it.each(["/forms/42/analytics", "/forms/42/audience/preview-as"])(
  "avoids a disabled workspace resolver at %s",
  async (resolvePath) => {
    me.mockResolvedValue(snapshot(true, [{ ...action, resolvePath }]));
    expect(await destination("/forms")).toBe(origin + "/required-actions");
  },
);

it("terminates the settings → disabled export resolver → settings cycle at account guidance", async () => {
  const exportPath = "/settings/organization/export-formats";
  me.mockResolvedValue(
    snapshot(true, [{ ...action, resolvePath: exportPath }]),
  );
  exportEnabled.mockResolvedValue(false);
  expect(await destination("/settings")).toBe(origin + "/required-actions");
  expect(await destination(exportPath)).toBe(origin + "/required-actions");
  expect(await destination("/required-actions")).toBeNull();
  exportEnabled.mockResolvedValue(true);
  expect(await destination("/settings")).toBe(origin + exportPath);
  expect(await destination(exportPath)).toBeNull();
});

it("checks an optional resolver reached from a refusal on an older host without changing ordinary access", async () => {
  const exportPath = "/settings/organization/export-formats";
  me.mockResolvedValue(snapshot(undefined));
  exportEnabled.mockResolvedValue(false);
  expect(await destination(exportPath)).toBeNull();
  expect(await destination(resolverVisit(exportPath))).toBe(
    origin + "/required-actions",
  );
});
