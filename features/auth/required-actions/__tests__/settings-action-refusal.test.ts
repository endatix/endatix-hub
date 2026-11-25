import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { patchTenantSettingsAction } from "@/features/tenant/application/patch-tenant-settings.action";
import { registerStandingRefusalHandler } from "@/lib/endatix-api/shared/standing-refusal-handler";
import { handleActionRefusal } from "../handle-action-refusal.server";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/auth", () => ({
  auth: async () => ({ accessToken: "test-access" }),
}));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({
    requireHubAccess: vi.fn(),
    requirePermission: vi.fn(),
  }),
  Permissions: { Tenant: { ManageSettings: "tenant.settings.manage" } },
}));

const origin = "https://hub.example";
const action = {
  key: "profile",
  scope: "user",
  severity: "blocking",
  resolverRoles: [],
  canResolve: true,
  blockNonResolvers: false,
  resolvePath: "/profile",
};

beforeEach(() => {
  vi.stubEnv("ENDATIX_BASE_URL", "https://api.example");
  vi.mocked(headers).mockResolvedValue(
    new Headers({
      origin,
      referer: `${origin}/settings/organization/forms`,
      "next-action": "save",
    }),
  );
  registerStandingRefusalHandler(handleActionRefusal);
});

afterEach(() => registerStandingRefusalHandler());

it("redirects a save refused after the settings form was opened", async () => {
  // Arrange
  vi.stubGlobal("fetch", async () =>
    Response.json(
      {
        status: 403,
        errorCode: "required_action",
        requiredActions: [action],
      },
      { status: 403 },
    ),
  );

  // Act
  const result = patchTenantSettingsAction({ requireFolderAssignment: true });

  // Assert
  await expect(result.catch((e) => getURLFromRedirectError(e))).resolves.toBe(
    "/profile",
  );
});

it.each([403, 503])(
  "returns the ordinary %i save failure without navigating",
  async (status) => {
    // Arrange
    vi.stubGlobal("fetch", async () =>
      Response.json({ status, title: "Unavailable" }, { status }),
    );

    // Act & Assert
    expect(
      await patchTenantSettingsAction({ requireFolderAssignment: true }),
    ).toMatchObject({ statusCode: status });
  },
);
