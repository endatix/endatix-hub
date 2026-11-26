import { expect, it, vi } from "vitest";
import { WORKSPACE_NAVIGATION } from "@/lib/routes/workspace-navigation";
import { termsVisit } from "@/lib/routes/terms-journey";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";

const { requestHeaders } = vi.hoisted(() => ({ requestHeaders: vi.fn() }));
vi.mock("next/headers", () => ({ headers: requestHeaders }));
vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "42" }, accessToken: "member" }),
}));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class {
    auth = {
      getAuthorizationData: async () => ({
        success: true,
        data: {
          isAdmin: true,
          roles: ["PlatformAdmin"],
          requiredActionsEnforced: true,
          requiredActions: [
            {
              key: "saas.legal.terms",
              severity: "blocking",
              scope: "user",
              canResolve: true,
              resolvePath: "/accept-terms",
              resolverRoles: [],
              blockNonResolvers: true,
            },
          ],
        },
      }),
    };
  },
}));
vi.mock("@/lib/feature-flags/flags", async (original) => ({
  ...(await original<object>()),
  termsAcceptanceEnabled: async () => true,
  getAllFlags: async () => ({ saasManagement: true }),
  tenantManagementFlag: async () => true,
  reportingExportFlag: async () => true,
  formAnalyticsFlag: async () => true,
  personalizationFlag: async () => true,
  storageStatsFlag: async () => true,
}));

type Props = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
};
const pages = import.meta.glob<{ default: (props: Props) => Promise<unknown> }>(
  "/app/\\(main\\)/**/page.tsx",
);

// Parallel slots, the repair page and the redirect-only alias are not product page entries.
const entries = Object.keys(pages)
  .map((file) => ({
    file,
    path:
      file
        .slice("/app/(main)".length, -"/page.tsx".length)
        .replaceAll(/\[\w+\]/g, "42") || "/",
  }))
  .filter(
    ({ path }) =>
      !path.includes("@") &&
      path !== "/admin/legal" &&
      path !== "/settings/organization",
  );

it.each(entries)(
  "resolves pending Terms after admission on $path",
  async ({ file, path }) => {
    // Arrange
    const source = `${path}?tab=details`;
    requestHeaders.mockResolvedValue(
      new Headers({ [WORKSPACE_NAVIGATION]: source }),
    );
    const { default: page } = await pages[file]();
    const params = Object.fromEntries(
      [...file.matchAll(/\[(\w+)\]/g)].map((match) => [match[1], "42"]),
    );
    const target = termsVisit(source, workspaceScope("member"));

    // Act & Assert
    await expect(
      page({
        params: Promise.resolve(params),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ digest: expect.stringContaining(`;${target};`) });
  },
);
