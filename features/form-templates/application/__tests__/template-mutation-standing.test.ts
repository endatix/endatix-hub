import { beforeEach, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { deleteTemplateAction } from "../delete-template.action";
import { updateTemplateJsonAction } from "../update-template-json.action";
import { updateTemplateNameAction } from "../update-template-name.action";

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "session" }) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ requireHubAccess: vi.fn() }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const blocker = {
  key: "profile",
  scope: "user",
  severity: "blocking",
  canResolve: true,
  resolvePath: "/settings/security",
  resolverRoles: [],
  blockNonResolvers: false,
};
beforeEach(() => vi.stubEnv("ENDATIX_BASE_URL", "https://api.example"));

it.each([
  ["rename", () => updateTemplateNameAction("8", "Renamed")],
  ["edit", () => updateTemplateJsonAction("8", {})],
  ["delete", () => deleteTemplateAction("8")],
] as const)(
  "%s keeps the API's typed refusal and does not revalidate a failed write",
  async (_, mutate) => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          status: 403,
          errorCode: "required_action",
          requiredActions: [blocker],
        },
        { status: 403 },
      ),
    );
    expect(await mutate()).toMatchObject({
      statusCode: 403,
      requiredAction: { kind: "required_action", actions: [blocker] },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  },
);

it.each([
  ["rename", () => updateTemplateNameAction("8", "Renamed")],
  ["edit", () => updateTemplateJsonAction("8", {})],
  ["delete", () => deleteTemplateAction("8")],
] as const)(
  "%s still returns the template ID after an admitted write",
  async (_, mutate) => {
    vi.stubGlobal("fetch", async () => Response.json("8"));
    expect(await mutate()).toMatchObject({ value: "8" });
    expect(revalidatePath).toHaveBeenCalled();
  },
);
