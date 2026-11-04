import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Route } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { deleteAudiencePersonAction } from "../delete-audience-person.action";
import { RemovePersonDialog } from "../ui/remove-person-dialog";

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../delete-audience-person.action", () => ({
  deleteAudiencePersonAction: vi.fn(),
}));

const PERSON = {
  membershipId: "981",
  audienceMemberId: "7",
  identifier: "tester@example.com",
} as AudiencePerson;

function renderDialog(afterRemove?: Route) {
  const onClose = vi.fn();
  render(
    <RemovePersonDialog
      formId="1"
      person={PERSON}
      open
      onClose={onClose}
      afterRemove={afterRemove}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  return { onClose };
}

describe("RemovePersonDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteAudiencePersonAction).mockResolvedValue(
      Result.success(undefined),
    );
  });

  it("removes the membership and refreshes the list it was opened from", async () => {
    const { onClose } = renderDialog();

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(deleteAudiencePersonAction).toHaveBeenCalledWith("1", "981");
    expect(onClose).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("goes to the given page with a toast instead, when the page it was opened from is the participant's", async () => {
    renderDialog("/forms/1/audience" as Route);

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/forms/1/audience"),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
