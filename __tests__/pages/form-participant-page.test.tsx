import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/features/audience/shared/require-audience-api.server", () => ({
  PARTICIPANT_PAGE_PERMISSION: "forms.edit",
  requireAudienceAccess: vi.fn(),
}));

vi.mock("@/features/audience/copy-test-link", () => ({
  testLinkAccess: vi
    .fn()
    .mockResolvedValue({ canCopyTestLink: true, canMintTestLinks: true }),
}));

vi.mock("@/features/audience/get-participant-page", () => ({
  loadParticipantPage: vi.fn(),
  ParticipantGone: ({ formId }: { formId: string }) => <p>gone {formId}</p>,
  ParticipantPage: () => <p>participant page</p>,
}));

vi.mock("@/features/forms/form-workspace/load-workspace-form.server", () => ({
  loadWorkspaceForm: vi.fn(),
}));

vi.mock("@/features/forms/form-workspace/ui/form-load-error", () => ({
  FormLoadError: () => <p>load error</p>,
}));

const params = Promise.resolve({ formId: "f1", memberId: "m1" });

describe("Form participant page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a reader who cannot edit the form back to it", async () => {
    const { requireAudienceAccess } =
      await import("@/features/audience/shared/require-audience-api.server");
    const { redirect } = await import("next/navigation");
    vi.mocked(requireAudienceAccess).mockResolvedValue(Result.error("no"));
    const Page = (
      await import("@/app/(main)/forms/[formId]/audience/participants/[memberId]/page")
    ).default;

    await expect(Page({ params })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/forms/f1");
  });

  it("shows the load error when the form or the participant read fails", async () => {
    const { requireAudienceAccess } =
      await import("@/features/audience/shared/require-audience-api.server");
    const { loadWorkspaceForm } =
      await import("@/features/forms/form-workspace/load-workspace-form.server");
    const { loadParticipantPage } =
      await import("@/features/audience/get-participant-page");
    vi.mocked(requireAudienceAccess).mockResolvedValue(
      Result.success({
        api: {},
        checkPermission: vi.fn().mockResolvedValue({ success: true }),
      } as never),
    );
    vi.mocked(loadWorkspaceForm).mockResolvedValue(Result.error("form"));
    vi.mocked(loadParticipantPage).mockResolvedValue(
      Result.success({ status: "gone" }),
    );
    const Page = (
      await import("@/app/(main)/forms/[formId]/audience/participants/[memberId]/page")
    ).default;

    render(await Page({ params }));
    screen.getByText("load error");

    vi.mocked(loadWorkspaceForm).mockResolvedValue(Result.success({}));
    vi.mocked(loadParticipantPage).mockResolvedValue(Result.error("page"));
    render(await Page({ params }));
    expect(screen.getAllByText("load error")).toHaveLength(2);
  });

  it("shows the gone state when the participant is no longer on the form", async () => {
    const { loadParticipantPage } =
      await import("@/features/audience/get-participant-page");
    vi.mocked(loadParticipantPage).mockResolvedValue(
      Result.success({ status: "gone" }),
    );
    const Page = await openAsEditor();

    render(await Page({ params }));
    expect(screen.getByText("gone f1")).toBeDefined();
  });

  it("shows the participant when the read finds them", async () => {
    const { loadParticipantPage } =
      await import("@/features/audience/get-participant-page");
    vi.mocked(loadParticipantPage).mockResolvedValue(
      Result.success({
        status: "found",
        data: {
          participant: {},
          identifierKind: "email",
          properties: [],
          canTest: false,
        },
      } as never),
    );
    const Page = await openAsEditor();

    render(await Page({ params }));
    screen.getByText("participant page");
    expect(loadParticipantPage).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "f1",
        memberId: "m1",
        canTest: false,
      }),
    );
  });
});

async function openAsEditor() {
  const { requireAudienceAccess } =
    await import("@/features/audience/shared/require-audience-api.server");
  const { loadWorkspaceForm } =
    await import("@/features/forms/form-workspace/load-workspace-form.server");
  vi.mocked(requireAudienceAccess).mockResolvedValue(
    Result.success({
      api: { id: "api" },
      checkPermission: vi.fn().mockResolvedValue({ success: false }),
    } as never),
  );
  vi.mocked(loadWorkspaceForm).mockResolvedValue(Result.success({}));
  return (
    await import("@/app/(main)/forms/[formId]/audience/participants/[memberId]/page")
  ).default;
}
