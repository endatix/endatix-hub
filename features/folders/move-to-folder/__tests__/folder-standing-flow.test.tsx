import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { revalidatePath } from "next/cache";
import { useMoveToFolder } from "../use-move-to-folder.hook";

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "session" }) }));
vi.mock("@/features/auth/authorization", () => ({
  Permissions: {
    Forms: { Edit: "forms.edit" },
    Folders: { Manage: "folders.manage" },
  },
  authorization: async () => ({
    requireHubAccess: vi.fn(),
    requirePermission: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const blocker = {
  key: "profile",
  resolvePath: "/settings/security",
  scope: "user",
  severity: "blocking",
  resolverRoles: [],
  blockNonResolvers: false,
  canResolve: true,
};
function refusal() {
  return Response.json(
    { status: 403, errorCode: "required_action", requiredActions: [blocker] },
    { status: 403 },
  );
}
const target = { id: "42", name: "Archive", slug: "archive", isActive: true };

beforeEach(() => {
  history.replaceState(null, "", "/settings/security");
  vi.stubEnv("ENDATIX_BASE_URL", "https://api.example");
});

it("carries a typed refusal from the folder read to the open picker's recovery UI", async () => {
  // Arrange
  vi.stubGlobal("fetch", async () => refusal());
  const { result } = renderHook(() =>
    useMoveToFolder({ kind: "form", id: "7", name: "Survey" }),
  );

  // Act
  await act(() => result.current.openMoveDialog());

  // Assert
  expect(result.current.dialogProps.open).toBe(false);
  expect(toast.warning).toHaveBeenCalledWith(
    expect.objectContaining({ title: "An account action is required." }),
  );
  expect(toast.error).not.toHaveBeenCalled();
});

it.each(["form", "template"] as const)(
  "preserves a newly refused %s move after the picker loaded successfully",
  async (kind) => {
    // Arrange
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([target]))
      .mockResolvedValueOnce(refusal());
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() =>
      useMoveToFolder({ kind, id: "7", name: "Survey" }),
    );
    await act(() => result.current.openMoveDialog());
    expect(result.current.dialogProps.folderOptions).toMatchObject([
      { id: "42" },
    ]);
    act(() => result.current.dialogProps.onFolderChange("42"));

    // Act
    act(() => result.current.dialogProps.onMove());

    // Assert
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(fetch.mock.calls[1][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ folderId: "42" }),
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  },
);

it("refreshes folder lists only after an admitted move", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json([target]))
      .mockResolvedValueOnce(new Response(null, { status: 204 })),
  );
  const { result } = renderHook(() =>
    useMoveToFolder({ kind: "form", id: "7", name: "Survey" }),
  );
  await act(() => result.current.openMoveDialog());
  act(() => result.current.dialogProps.onFolderChange("42"));
  act(() => result.current.dialogProps.onMove());
  await waitFor(() => expect(result.current.dialogProps.open).toBe(false));
  expect(toast.success).toHaveBeenCalled();
  expect(revalidatePath).toHaveBeenCalledWith("/forms/folders");
});

it.each([
  [403, "Permission denied"],
  [503, "Status unavailable. Try again."],
] as const)(
  "keeps HTTP %i retry or denial copy in the picker",
  async (status, detail) => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ status, detail }, { status }),
    );
    const { result } = renderHook(() =>
      useMoveToFolder({ kind: "form", id: "7", name: "Survey" }),
    );
    await act(() => result.current.openMoveDialog());
    expect(toast.error).toHaveBeenCalledWith(detail);
    expect(toast.warning).not.toHaveBeenCalled();
  },
);
