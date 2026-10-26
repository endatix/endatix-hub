import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { reissueAudienceLinkAction } from "../reissue-audience-link.action";
import { ReissueLinkDialog } from "../ui/reissue-link-dialog";
import { useReissueLink } from "../use-reissue-link.hook";

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../reissue-audience-link.action", () => ({
  reissueAudienceLinkAction: vi.fn(),
}));

const PERSON = {
  membershipId: "981",
  audienceMemberId: "7",
  identifier: "ana@example.com",
} as AudiencePerson;

function renderDialog() {
  const onClose = vi.fn();
  render(
    <ReissueLinkDialog formId="1" person={PERSON} open onClose={onClose} />,
  );
  return { onClose };
}

const reissueButton = () =>
  screen.getByRole("button", { name: "Reissue link" });

describe("ReissueLinkDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reissueAudienceLinkAction).mockResolvedValue(
      Result.success({ membershipId: "981", token: "new-token" }),
    );
  });

  it("warns that the old link stops working, and Cancel reissues nothing", () => {
    const { onClose } = renderDialog();

    expect(screen.getByText(/current link stops working/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(reissueAudienceLinkAction).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows the new absolute link with a copy button", async () => {
    renderDialog();

    fireEvent.click(reissueButton());

    const link = await screen.findByDisplayValue(
      `${window.location.origin}/share/1/a/new-token`,
    );
    expect(link).toBeTruthy();
    expect(reissueAudienceLinkAction).toHaveBeenCalledWith("1", "981");
    expect(
      screen.getByRole("button", { name: "Copy the new link" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("alertdialog", { name: "New link for ana@example.com" })
        .textContent,
    ).toContain("old link no longer opens");
  });

  it.each([
    "Reissuing links needs a newer Endatix API.",
    "The link was reissued by another request meanwhile. Reissue it again for a token you can send.",
  ])("shows a failure in the dialog and no link: %s", async (message) => {
    vi.mocked(reissueAudienceLinkAction).mockResolvedValue(
      Result.error(message),
    );
    renderDialog();

    fireEvent.click(reissueButton());

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByDisplayValue(/share/)).toBeNull();
    expect(reissueButton()).toBeTruthy();
  });

  it("refreshes the list when it closes after a reissue", async () => {
    const { onClose } = renderDialog();
    fireEvent.click(reissueButton());
    await screen.findByDisplayValue(/new-token/);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});

describe("useReissueLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends one request for a double click, so the new link is not revoked at once", async () => {
    vi.mocked(reissueAudienceLinkAction).mockResolvedValue(
      Result.success({ membershipId: "981", token: "new-token" }),
    );
    const { result } = renderHook(() =>
      useReissueLink({ formId: "1", membershipId: "981" }),
    );

    await act(() =>
      Promise.all([result.current.reissue(), result.current.reissue()]),
    );

    expect(reissueAudienceLinkAction).toHaveBeenCalledTimes(1);
  });
});
