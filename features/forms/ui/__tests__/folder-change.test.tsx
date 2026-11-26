import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { toast } from "@/components/ui/toast";
import FormDetails from "../form-details";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { stubScrollIntoView } from "@/test/stubs/scroll-into-view";

const path = "/forms/7/settings";
const folder = {
  id: "42",
  name: "Archive",
  slug: "archive",
  isActive: true,
  immutable: false,
};
const blocker = {
  key: "profile.review",
  resolvePath: path,
  scope: "user",
  severity: "blocking",
  canResolve: true,
  resolverRoles: [],
  blockNonResolvers: false,
};
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/forms/7/settings",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "session" }) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({
    requireHubAccess: vi.fn(),
    requirePermission: vi.fn(),
  }),
  Permissions: { Folders: { Manage: "folders.manage" } },
}));
vi.mock("../../application/actions/get-tenant-settings.action", () => ({
  getTenantSettingsAction: async () => ({
    kind: 0,
    value: { submissionTokenExpiryHours: null },
  }),
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function picker() {
  return within(
    screen.getByText("Folder", { exact: true }).parentElement!,
  ).getByRole("combobox");
}
async function choose(label: string) {
  fireEvent.keyDown(picker(), { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name: label });
  fireEvent.click(option);
}

function openSettings(folderId: string | null) {
  const pending = Promise.withResolvers<Response>();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json([folder]))
    .mockReturnValueOnce(pending.promise);
  vi.stubGlobal("fetch", fetch);
  render(
    <FormDetails
      enableEditing
      form={{
        id: "7",
        name: "Survey",
        folderId,
        isEnabled: true,
        isPublic: false,
        createdAt: new Date(),
      }}
    />,
  );
  return {
    fetch,
    respond: async (body: object, status: number) =>
      act(async () =>
        pending.resolve(Response.json({ status, ...body }, { status })),
      ),
  };
}

beforeEach(() => {
  stubResizeObserver();
  history.replaceState(null, "", path);
  vi.stubEnv("ENDATIX_BASE_URL", "https://api.example");
  stubScrollIntoView();
});

it.each([
  {
    previous: null,
    from: "No folder",
    to: "Archive",
    patch: { folderId: "42" },
  },
  {
    previous: "42",
    from: "Archive",
    to: "No folder",
    patch: { clearFolderId: true },
  },
])(
  "restores $from before presenting a typed refusal of $to",
  async ({ previous, from, to, patch }) => {
    // Arrange
    const { fetch, respond } = openSettings(previous);
    let selectionAtPresentation: string | null = null;
    vi.mocked(toast.warning).mockImplementationOnce(() => {
      selectionAtPresentation = picker().textContent;
      return 1;
    });

    // Act
    await choose(to);
    await waitFor(() => expect(picker().textContent).toBe(to));
    expect(fetch.mock.calls[1][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await respond(
      { errorCode: "required_action", requiredActions: [blocker] },
      403,
    );

    // Assert
    expect(selectionAtPresentation).toBe(from);
    expect(picker().textContent).toBe(from);
    expect(toast.warning).toHaveBeenCalledWith(
      expect.objectContaining({ title: "An account action is required." }),
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  },
);

it.each([
  [403, "Permission denied."],
  [503, "Status unavailable. Try again."],
] as const)(
  "keeps the original selection and ordinary toast for HTTP %i",
  async (status, detail) => {
    const { fetch, respond } = openSettings(null);
    await choose("Archive");
    await respond({ detail }, status);
    expect(picker().textContent).toBe("No folder");
    expect(toast.error).toHaveBeenCalledWith(
      status === 503
        ? { title: "Status unavailable", description: "Try again." }
        : { title: "Permission denied.", description: undefined },
    );
    expect(toast.warning).not.toHaveBeenCalled();
    if (status === 503) {
      fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await choose("Archive");
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Folder updated"),
      );
      expect(picker().textContent).toBe("Archive");
      expect(refresh).toHaveBeenCalledTimes(1);
    }
  },
);
